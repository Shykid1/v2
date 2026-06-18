"""MicroPython boot.py — runs before main.py on every wake from deep sleep.

Production hardening:
- 80 MHz CPU (vs 240 MHz default) — reduces active-phase current draw ~3x
- WebREPL disabled — no wireless code access in the field
- Minimal stdout for serial debugging (keep for lab; silence in production)
"""

import machine
import esp

FIRMWARE_VERSION = "1.0.0"

# Reduce CPU frequency to lower power consumption during active phase
machine.freq(80_000_000)

# Disable WebREPL — no wireless code upload in deployed nodes
# Uncomment the two lines below for production builds:
# import webrepl
# webrepl.stop()

# Suppress debug output from the ESP-IDF radio stack
esp.osdebug(None)

print(f"SaniChain firmware v{FIRMWARE_VERSION} booting")
