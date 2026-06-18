"""Simulator node — mirrors the firmware/main.py boot/read/post/sleep cycle.

Each Node runs as a daemon thread. The cycle is:
  1. Advance physics (fill, battery, temp, RSSI)
  2. Sign payload with HMAC-SHA256 (device_id:pit_code:timestamp:fill:battery)
  3. POST to the v2 backend /api/readings (or enqueue on failure)
  4. Flush offline queue on the next connected cycle
  5. Choose next sleep duration based on fill level and battery state
  6. Sleep (real seconds = sim_hours × 3600 / TIME_SCALE)
"""

import json
import random
import time
import threading
from datetime import datetime, timezone

import requests

import config
import sensors as sim_sensors
from crypto import sign_payload
from storage import OfflineQueue

_COLORS = ["\033[36m", "\033[33m", "\033[35m", "\033[32m", "\033[34m"]
_RESET = "\033[0m"
_BOLD = "\033[1m"


class Node(threading.Thread):
    def __init__(self, node_cfg: dict, color: str):
        super().__init__(daemon=True)
        self.name = node_cfg["device_id"]
        self.cfg = node_cfg

        self.fill_pct = node_cfg["initial_fill_pct"]
        self.battery_mv = node_cfg["initial_battery_mv"]
        self.rssi = random.randint(-70, -60)
        self._sleep_h = config.SLEEP_NORMAL_H
        self._queue = OfflineQueue()
        self._color = color

    # ─── Console output ────────────────────────────────────────────────────────

    def _log(self, msg: str):
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        print(f"{self._color}[{ts}] {self.cfg['device_id']:>14} │ {msg}{_RESET}", flush=True)

    # ─── HTTP POST (mirrors modem.http_post) ───────────────────────────────────

    def _post(self, json_str: str) -> bool:
        if random.random() < config.HTTP_FAILURE_RATE:
            self._log("HTTP failure injected")
            return False
        try:
            resp = requests.post(
                config.API_URL,
                data=json_str,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            if not (200 <= resp.status_code < 300):
                self._log(f"HTTP {resp.status_code}: {resp.text[:160]}")
                return False
            # Surface the auto-created job id when the pit crosses the fill threshold.
            try:
                body = resp.json()
                if body.get("job_created"):
                    self._log(f"{_BOLD}→ JOB CREATED {body['job_created']}{_RESET}{self._color}")
            except ValueError:
                pass
            return True
        except requests.RequestException as exc:
            self._log(f"Request error: {exc}")
            return False

    # ─── Single wake cycle ─────────────────────────────────────────────────────

    def _run_cycle(self):
        utc_now = datetime.now(timezone.utc)
        connected = random.random() >= config.NETWORK_FAILURE_RATE

        fill_cm, fill_pct = sim_sensors.read_fill_level(self.fill_pct, self.cfg["pit_depth_cm"])
        temp_c, humidity = sim_sensors.read_dht(utc_now)
        self.battery_mv, charge = sim_sensors.advance_battery(
            self.battery_mv, self._sleep_h, utc_now
        )
        self.rssi = sim_sensors.read_rssi(self.rssi)

        critical_battery = (
            self.battery_mv < config.BATT_CRITICAL_MV and not charge["solar_present"]
        )

        timestamp = utc_now.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        hmac = sign_payload(
            self.cfg["device_id"],
            self.cfg["pit_code"],
            timestamp,
            fill_pct,
            self.battery_mv,
            self.cfg["hmac_key"],
        )

        # GPS: jitter ±0.001° (~110m) around the pit coordinates (GPRS-reported fix)
        gps_lat = self.cfg["pit_lat"] + random.uniform(-0.001, 0.001)
        gps_lng = self.cfg["pit_lng"] + random.uniform(-0.001, 0.001)

        payload = json.dumps({
            "device_id":     self.cfg["device_id"],
            "pit_code":      self.cfg["pit_code"],
            "timestamp":     timestamp,
            "fill_pct":      fill_pct,
            "fill_cm":       fill_cm,
            "pit_depth_cm":  self.cfg["pit_depth_cm"],
            "temperature_c": temp_c,
            "humidity_pct":  humidity,
            "battery_mv":    self.battery_mv,
            "rssi":          self.rssi,
            "lat":           round(gps_lat, 6),
            "lng":           round(gps_lng, 6),
            "hmac":          hmac,
        })

        if not connected:
            self._queue.enqueue(timestamp, payload)
            self._log(
                f"GPRS fail → queued  fill={fill_pct:5.1f}%  "
                f"batt={self.battery_mv}mV  queue={self._queue.depth()}"
            )
        else:
            if not critical_battery and self._queue.depth() > 0:
                flushed = self._queue.flush(self._post)
                self._log(f"Queue flushed {flushed} item(s)  remaining={self._queue.depth()}")

            ok = self._post(payload)
            if ok:
                flags = []
                if charge["charging"]:        flags.append("charging")
                if charge["charge_complete"]: flags.append("full")
                if critical_battery:          flags.append("BATT CRITICAL")
                if self._queue.depth():       flags.append(f"queue={self._queue.depth()}")
                self._log(
                    f"{_BOLD}POST OK{_RESET}{self._color}  "
                    f"fill={fill_pct:5.1f}%  batt={self.battery_mv}mV  "
                    f"temp={temp_c}°C  hum={humidity}%  rssi={self.rssi}dBm"
                    + (f"  [{', '.join(flags)}]" if flags else "")
                )
            else:
                self._queue.enqueue(timestamp, payload)
                self._log(f"POST fail → queued  fill={fill_pct:5.1f}%  queue={self._queue.depth()}")

        self.fill_pct = sim_sensors.advance_fill(
            fill_pct, self.cfg["fill_rate_pct_per_day"], self._sleep_h
        )

        if critical_battery:
            self._sleep_h = config.SLEEP_CRITICAL_H
        elif fill_pct > (config.FILL_ALERT_PCT - 10):
            self._sleep_h = config.SLEEP_ALERT_H
        else:
            self._sleep_h = config.SLEEP_NORMAL_H

    # ─── Thread entry point ────────────────────────────────────────────────────

    def run(self):
        self._log("Node started")
        while True:
            try:
                self._run_cycle()
            except Exception as exc:
                self._log(f"Cycle error: {exc}")

            real_sleep = self._sleep_h * 3600 / config.TIME_SCALE
            self._log(f"Sleeping {self._sleep_h}h sim ({real_sleep:.1f}s real)")
            time.sleep(real_sleep)
