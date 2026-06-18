"""Simulator configuration — one entry per simulated sensor node.

Each node maps to a sensored Pit + Device in the SaniChain v2 database.
To get the HMAC keys from your seeded database:
    SELECT "deviceId", "hmacKey" FROM devices;

The seed (prisma/seed.ts) creates device SANI-ESP32-001 on pit PIT-00001 with
hmac key "dev-hmac-key-001" — the defaults below match it out of the box.
"""

API_URL = "http://localhost:4000/api/readings"

# Time acceleration: 1 simulated hour = (3600 / TIME_SCALE) real seconds.
# 360x → 6-hour normal cycle fires every 60 real seconds.
TIME_SCALE = 360

# Sleep durations (hours) — must match firmware/config.py
SLEEP_NORMAL_H = 6
SLEEP_ALERT_H = 1
SLEEP_CRITICAL_H = 12
FILL_ALERT_PCT = 80
BATT_CRITICAL_MV = 3200
BATT_LOW_MV = 3500

# Failure injection: raise to stress-test the offline queue
NETWORK_FAILURE_RATE = 0.05  # probability GPRS fails per cycle
HTTP_FAILURE_RATE = 0.02     # probability POST fails despite connectivity

NODES = [
    {
        "device_id":             "SANI-ESP32-001",
        "pit_code":              "PIT-00001",
        "hmac_key":              "dev-hmac-key-001",
        "pit_depth_cm":          200,
        "fill_rate_pct_per_day": 6.0,
        "initial_fill_pct":      72.0,   # starts near the 80% threshold for a quick demo
        "initial_battery_mv":    3850,
        "pit_lat":               10.5167,
        "pit_lng":               -0.3667,
    },
]
