"""Physics-based sensor simulation for East Mamprusi, Ghana (UTC+0, ~10°N).

Each function mirrors its firmware/sensors.py counterpart but runs on the
desktop using stdlib math instead of MicroPython hardware drivers.
"""

import math
import random
from datetime import datetime


# ─── Reading functions (called once per cycle with current state) ──────────────

def read_fill_level(current_fill_pct: float, pit_depth_cm: int) -> tuple:
    """Return (fill_cm, fill_pct) with small HC-SR04-style measurement noise."""
    noisy_pct = current_fill_pct + random.gauss(0, 0.5)
    noisy_pct = max(0.0, min(100.0, noisy_pct))
    fill_cm = round(pit_depth_cm * (1.0 - noisy_pct / 100.0), 1)
    return fill_cm, round(noisy_pct, 1)


def read_dht(utc_now: datetime) -> tuple:
    """Return (temperature_c, humidity_pct) based on time of day."""
    hour_frac = utc_now.hour + utc_now.minute / 60.0
    temp = 30.0 + 7.0 * math.sin((hour_frac - 8.0) * math.pi / 12.0)
    temp = round(max(18.0, min(45.0, temp + random.gauss(0, 0.4))), 1)

    humidity = 70.0 - (temp - 23.0) * 1.5
    humidity = round(max(20.0, min(95.0, humidity + random.gauss(0, 2.0))), 1)

    return temp, humidity


def read_rssi(current_rssi: int) -> int:
    """Random walk RSSI within 2G range (-55 to -90 dBm)."""
    return max(-90, min(-55, current_rssi + random.randint(-3, 3)))


# ─── Advance functions (update state between cycles) ──────────────────────────

def advance_fill(
    current_fill_pct: float,
    fill_rate_pct_per_day: float,
    sleep_hours: float,
) -> float:
    """Advance fill level by one sleep cycle.

    1% chance per cycle of a maintenance reset (pit emptied by a provider).
    """
    if random.random() < 0.01:
        return round(random.uniform(3.0, 8.0), 1)

    increment = fill_rate_pct_per_day * sleep_hours / 24.0
    new_fill = current_fill_pct + increment + random.gauss(0, 0.2)
    return round(max(0.0, min(100.0, new_fill)), 1)


def advance_battery(current_mv: int, sleep_hours: float, utc_now: datetime) -> tuple:
    """Advance battery state based on solar availability (06:00–18:00 UTC)."""
    solar_present = 6 <= utc_now.hour < 18

    if solar_present:
        if current_mv >= 4150:
            delta = random.uniform(-5, 15) * sleep_hours
            charging = False
            charge_complete = True
        else:
            delta = random.uniform(60, 120) * sleep_hours
            charging = True
            charge_complete = False
    else:
        delta = -random.uniform(5, 12) * sleep_hours
        charging = False
        charge_complete = False

    new_mv = max(2800, min(4200, int(current_mv + delta)))
    return new_mv, {
        "charging": charging,
        "charge_complete": charge_complete,
        "solar_present": solar_present,
    }
