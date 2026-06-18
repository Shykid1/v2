"""SaniChain v2 sensor node — main entry point.

Boot sequence:
  1. Init SIM800L, register on 2G network
  2. Bring up GPRS bearer
  3. Flush any offline-queued payloads from previous failed cycles
  4. Read sensors (HC-SR04, DHT22, battery ADC)
  5. Sync NTP → ISO-8601 UTC timestamp
  6. Sign payload with HMAC-SHA256 (device_id:pit_code:timestamp:fill:battery)
  7. HTTP POST to backend /api/readings; queue to flash on failure
  8. Tear down GPRS, power off modem
  9. Deep sleep (6 h normal, 1 h when fill approaches alert threshold)
"""

import ujson
from machine import deepsleep

from config import (
    DEVICE_ID, PIT_CODE, PIT_DEPTH_CM,
    SLEEP_NORMAL_H, SLEEP_ALERT_H, SLEEP_CRITICAL_H, FILL_ALERT_PCT,
    BATT_CRITICAL_MV,
)
from sensors import read_fill_level, read_dht, read_battery, read_charging_status
from modem import Modem, ModemError
from ntp import get_timestamp
from crypto import sign_payload
from storage import flush_queue, enqueue_payload


def main():
    modem = Modem()

    try:
        modem.boot()
        modem.gprs_up()
    except ModemError:
        modem.power_off()
        fill_pct = _read_and_queue()
        _sleep(fill_pct)
        return

    fill_cm, fill_pct = read_fill_level()
    temp_c, humidity = read_dht()
    battery_mv = read_battery()
    charge = read_charging_status()
    critical_battery = battery_mv < BATT_CRITICAL_MV and not charge["solar_present"]

    if not critical_battery:
        flush_queue(modem)

    rssi = modem.get_rssi()
    timestamp = get_timestamp(modem)

    hmac = sign_payload(DEVICE_ID, PIT_CODE, timestamp, fill_pct, battery_mv)

    payload = ujson.dumps({
        "device_id":     DEVICE_ID,
        "pit_code":      PIT_CODE,
        "timestamp":     timestamp,
        "fill_pct":      fill_pct,
        "fill_cm":       fill_cm,
        "pit_depth_cm":  PIT_DEPTH_CM,
        "temperature_c": temp_c,
        "humidity_pct":  humidity,
        "battery_mv":    battery_mv,
        "rssi":          rssi,
        "hmac":          hmac,
    })

    ok = modem.http_post(payload)
    if not ok:
        enqueue_payload(timestamp, payload)

    modem.gprs_down()
    modem.power_off()

    _sleep(fill_pct, critical_battery)


def _read_and_queue() -> float:
    """Read sensors, queue payload to flash, return fill_pct for sleep scheduling."""
    fill_cm, fill_pct = read_fill_level()
    temp_c, humidity = read_dht()
    battery_mv = read_battery()
    timestamp = "1970-01-01T00:00:00.000Z"  # no network — backend will reject+retry
    hmac = sign_payload(DEVICE_ID, PIT_CODE, timestamp, fill_pct, battery_mv)

    payload = ujson.dumps({
        "device_id":     DEVICE_ID,
        "pit_code":      PIT_CODE,
        "timestamp":     timestamp,
        "fill_pct":      fill_pct,
        "fill_cm":       fill_cm,
        "pit_depth_cm":  PIT_DEPTH_CM,
        "temperature_c": temp_c,
        "humidity_pct":  humidity,
        "battery_mv":    battery_mv,
        "rssi":          -99,
        "hmac":          hmac,
    })
    enqueue_payload(timestamp, payload)
    return fill_pct


def _sleep(fill_pct: float, critical_battery: bool = False):
    """Choose sleep duration based on fill level and battery state."""
    if critical_battery:
        hours = SLEEP_CRITICAL_H
    elif fill_pct > (FILL_ALERT_PCT - 10):
        hours = SLEEP_ALERT_H
    else:
        hours = SLEEP_NORMAL_H
    deepsleep(hours * 3_600_000)


main()
