"""Proper HMAC-SHA256 per RFC 2104 using MicroPython's uhashlib.

The backend readings HmacGuard uses the identical algorithm and canonical message
format — see v2/server/src/readings/guards/hmac.guard.ts.
"""

import uhashlib
import ubinascii
from config import HMAC_KEY

_BLOCK_SIZE = 64  # SHA-256 block size in bytes


def hmac_sha256(key: bytes, message: bytes) -> str:
    """Return hex-encoded HMAC-SHA256(key, message)."""
    if len(key) > _BLOCK_SIZE:
        key = uhashlib.sha256(key).digest()
    key = key + b"\x00" * (_BLOCK_SIZE - len(key))

    ipad = bytes(b ^ 0x36 for b in key)
    opad = bytes(b ^ 0x5C for b in key)

    inner = uhashlib.sha256(ipad + message).digest()
    outer = uhashlib.sha256(opad + inner).digest()
    return ubinascii.hexlify(outer).decode()


def sign_payload(
    device_id: str,
    pit_code: str,
    timestamp: str,
    fill_pct: float,
    battery_mv: int,
) -> str:
    """Canonical message string + HMAC-SHA256 signature.

    fill_pct is formatted to 1 decimal place so firmware and backend produce
    identical strings. Backend reconstructs with Number(fillPct).toFixed(1).
    """
    message = f"{device_id}:{pit_code}:{timestamp}:{fill_pct:.1f}:{battery_mv}"
    return hmac_sha256(HMAC_KEY, message.encode("utf-8"))
