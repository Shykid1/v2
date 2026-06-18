"""stdlib HMAC — mirrors firmware/crypto.py sign_payload() exactly.

The message format and hex encoding are identical to the backend HmacGuard:
    f"{device_id}:{pit_code}:{timestamp}:{fill_pct:.1f}:{battery_mv}"
"""

import hashlib
import hmac as _hmac


def sign_payload(
    device_id: str,
    pit_code: str,
    timestamp: str,
    fill_pct: float,
    battery_mv: int,
    hmac_key: str,
) -> str:
    """Return hex-encoded HMAC-SHA256 matching the firmware + backend guard.

    fill_pct is formatted to 1 decimal place (f"{fill_pct:.1f}") and the backend
    reconstructs the message with Number(fillPct).toFixed(1), so both agree.
    """
    message = f"{device_id}:{pit_code}:{timestamp}:{fill_pct:.1f}:{battery_mv}"
    key = hmac_key.encode("utf-8") if isinstance(hmac_key, str) else hmac_key
    return _hmac.new(key, message.encode("utf-8"), hashlib.sha256).hexdigest()
