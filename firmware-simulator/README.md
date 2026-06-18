# SaniChain v2 — Sensor Simulator

Multi-node sensor data generator. Each node maps to a sensored Pit + Device in the v2
database and posts HMAC-signed readings to the API, exactly like the ESP32 firmware —
so you can demo `sensor → job → dispatch → payment → notification` with no hardware.

## Run

```bash
pip install -r requirements.txt
python run.py
```

The default node (`SANI-ESP32-001` / `PIT-00001` / key `dev-hmac-key-001`) matches the
server seed (`prisma/seed.ts`). It starts at 72% fill and climbs; when it crosses the
`sensor.fillThresholdPct` (default 80%) the server auto-creates a `sensor_fill` job and
the simulator prints `→ JOB CREATED <id>`.

## Configure

Edit `config.py`:
- `API_URL` — backend readings endpoint (default `http://localhost:4000/api/readings`).
- `NODES` — one entry per device; `hmac_key` must match `devices.hmacKey` in the DB:
  ```sql
  SELECT "deviceId", "hmacKey" FROM devices;
  ```
- `TIME_SCALE` — clock acceleration (360× → a 6-hour cycle every 60 real seconds).

The signed message is `device_id:pit_code:timestamp:fill_pct(.1f):battery_mv`, matching
the backend `HmacGuard`.
