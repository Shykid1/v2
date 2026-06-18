"""NTP time sync via SIM800L AT+CNTP, returns ISO-8601 UTC string.

Deep sleep resets all MicroPython state on every wake cycle, so there is no
in-memory epoch to carry between wakes. The strategy per wake is:
  1. NTP sync via AT+CNTP → AT+CCLK? (primary path)
  2. Return sentinel "1970-01-01T00:00:00Z" on failure → backend rejects
     with 422; payload is queued to flash and retried next cycle.
"""

from modem import Modem, ModemError


def _parse_cclk(resp: str) -> str | None:
    """Parse AT+CCLK? response into ISO-8601 UTC string.

    Response format: +CCLK: "26/05/08,06:00:00+00"
    Returns:         "2026-05-08T06:00:00Z"
    Returns None if parsing fails.
    """
    try:
        # Split on double-quote: ['...', '26/05/08,06:00:00+00', '...']
        inner = resp.split('"')[1]
        date_part, time_part = inner.split(",")
        yy, mm, dd = date_part.split("/")
        hhmmss = time_part[:8]  # strip timezone suffix "+00" etc.
        return f"20{yy}-{mm}-{dd}T{hhmmss}Z"
    except Exception:
        return None


def get_timestamp(modem: Modem) -> str:
    """Sync time via SIM800L and return an ISO-8601 UTC string.

    Returns a sentinel on failure. The backend enforces a ±5 minute window;
    a sentinel timestamp will be rejected and the payload queued for retry.
    """
    try:
        modem._at("AT+CNTPCID=1")                        # use GPRS bearer
        modem._at('AT+CNTP="pool.ntp.org",0')            # UTC, no offset
        modem._at("AT+CNTP", "+CNTP:", 10_000)           # trigger sync
        resp_cclk = modem._at("AT+CCLK?", "+CCLK:")
        ts = _parse_cclk(resp_cclk)
        if ts:
            return ts
    except Exception:
        pass

    # Backend will reject this; payload is queued and retried next wake.
    return "1970-01-01T00:00:00Z"
