"""SIM800L driver: AT command engine, GPRS, HTTP POST, RSSI, power control."""

import time
from machine import UART, Pin
from config import (
    UART_ID, UART_TX, UART_RX, UART_BAUD,
    PIN_SIM_PWRKEY,
    APN, API_HOST, API_PORT, API_PATH,
    GPRS_TIMEOUT_S, HTTP_TIMEOUT_S, MAX_RETRIES,
)

_AT_DELAY_MS = 100   # inter-command guard
_POLL_MS     = 10    # yield interval inside _read_until to avoid busy-wait


class ModemError(Exception):
    pass


class Modem:
    def __init__(self):
        self._uart = UART(
            UART_ID,
            baudrate=UART_BAUD,
            tx=UART_TX,
            rx=UART_RX,
            timeout=1000,
        )
        self._pwrkey = Pin(PIN_SIM_PWRKEY, Pin.OUT, value=0)
        self._rssi = -99  # cached after boot

    # ──────────────────────────────────────────────────────────────
    # AT command engine
    # ──────────────────────────────────────────────────────────────

    def _send(self, cmd: str):
        self._uart.write((cmd + "\r\n").encode())

    def _read_until(self, expected: bytes, timeout_ms: int) -> str:
        """Accumulate UART bytes until `expected` appears or timeout."""
        buf = b""
        deadline = time.ticks_add(time.ticks_ms(), timeout_ms)
        while time.ticks_diff(deadline, time.ticks_ms()) > 0:
            chunk = self._uart.read(64)
            if chunk:
                buf += chunk
                if expected in buf:
                    return buf.decode("utf-8", "ignore").strip()
            else:
                time.sleep_ms(_POLL_MS)  # yield — avoids burning CPU during long waits
        return buf.decode("utf-8", "ignore").strip()

    def _at(self, cmd: str, expected: str = "OK", timeout_ms: int = 5000) -> str:
        """Send AT command and return response, raising ModemError on failure."""
        self._send(cmd)
        time.sleep_ms(_AT_DELAY_MS)
        resp = self._read_until(expected.encode(), timeout_ms)
        if expected not in resp:
            raise ModemError(f"{cmd!r} → {resp!r}")
        return resp

    def _at_quiet(self, cmd: str, expected: str = "OK", timeout_ms: int = 5000) -> str:
        """Like _at but returns empty string instead of raising on failure."""
        try:
            return self._at(cmd, expected, timeout_ms)
        except ModemError:
            return ""

    # ──────────────────────────────────────────────────────────────
    # Power control
    # ──────────────────────────────────────────────────────────────

    def _toggle_power(self):
        """Toggle SIM800L via PWRKEY (pull HIGH ≥1 s)."""
        self._pwrkey.on()
        time.sleep_ms(1200)
        self._pwrkey.off()
        time.sleep_ms(3000)  # wait for modem to settle

    def power_on(self):
        """Ensure SIM800L is on by testing AT and toggling if unresponsive."""
        for _ in range(3):
            resp = self._at_quiet("AT", "OK", 2000)
            if resp:
                return
            self._toggle_power()
        raise ModemError("SIM800L did not respond after 3 power cycles")

    def power_off(self):
        """Cleanly power down SIM800L."""
        self._at_quiet("AT+CPOWD=1", "NORMAL POWER DOWN", 5000)

    # ──────────────────────────────────────────────────────────────
    # Modem initialisation
    # ──────────────────────────────────────────────────────────────

    def boot(self):
        """Initialise modem, verify SIM, wait for network registration."""
        self.power_on()
        self._at("ATE0")               # echo off
        self._at("AT+CMGF=1")          # SMS text mode (future use)
        self._at("AT+CPIN?", "+CPIN: READY")  # SIM present

        # Wait for network registration (CREG: 0,1 or 0,5 = roaming)
        deadline = time.ticks_add(time.ticks_ms(), GPRS_TIMEOUT_S * 1000)
        while time.ticks_diff(deadline, time.ticks_ms()) > 0:
            resp = self._at_quiet("AT+CREG?", "+CREG:", 3000)
            if ",1" in resp or ",5" in resp:
                break
            time.sleep_ms(2000)
        else:
            raise ModemError("Network registration timeout")

        # Cache RSSI after successful registration
        self._rssi = self._read_rssi()

    # ──────────────────────────────────────────────────────────────
    # RSSI
    # ──────────────────────────────────────────────────────────────

    def _read_rssi(self) -> int:
        """Parse AT+CSQ response into dBm. Returns -99 on failure."""
        try:
            resp = self._at("AT+CSQ", "+CSQ:")
            # Response: "+CSQ: 18,0" — raw value 99 means unknown
            part = resp.split("+CSQ:")[1].split(",")[0].strip()
            raw = int(part)
            if raw == 99:
                return -99
            # SIM800L formula: dBm = raw*2 - 113
            return raw * 2 - 113
        except Exception:
            return -99

    def get_rssi(self) -> int:
        return self._rssi

    # ──────────────────────────────────────────────────────────────
    # GPRS bearer (AT+SAPBR method)
    # ──────────────────────────────────────────────────────────────

    def gprs_up(self):
        """Open GPRS bearer. Retries MAX_RETRIES times on failure."""
        for attempt in range(MAX_RETRIES):
            try:
                self._at(f'AT+SAPBR=3,1,"Contype","GPRS"')
                self._at(f'AT+SAPBR=3,1,"APN","{APN}"')
                self._at("AT+SAPBR=1,1", "OK", GPRS_TIMEOUT_S * 1000)
                # Confirm IP assigned
                resp = self._at("AT+SAPBR=2,1", "+SAPBR:")
                if "0.0.0.0" not in resp:
                    return  # success
            except ModemError:
                pass
            # Power-cycle between retries — but not after the last attempt
            if attempt < MAX_RETRIES - 1:
                self._toggle_power()
                self.boot()
        raise ModemError("GPRS bearer failed after retries")

    def gprs_down(self):
        """Close GPRS bearer to stop data billing."""
        self._at_quiet("AT+SAPBR=0,1")

    # ──────────────────────────────────────────────────────────────
    # HTTP POST
    # ──────────────────────────────────────────────────────────────

    def http_post(self, json_str: str) -> bool:
        """POST json_str to the configured API endpoint.

        Returns True on HTTP 2xx, False otherwise.
        Caller is responsible for queuing failed payloads.
        """
        url = f"http://{API_HOST}:{API_PORT}{API_PATH}"
        body = json_str.encode("utf-8")
        body_len = len(body)

        try:
            self._at("AT+HTTPINIT")
            self._at('AT+HTTPPARA="CID",1')
            self._at(f'AT+HTTPPARA="URL","{url}"')
            self._at('AT+HTTPPARA="CONTENT","application/json"')

            # Signal body length; modem replies "DOWNLOAD" then expects raw bytes
            self._at(f"AT+HTTPDATA={body_len},5000", "DOWNLOAD", 6000)
            self._uart.write(body)
            # Wait for modem to acknowledge the data with "OK" before issuing
            # AT+HTTPACTION — without this, the POST command races the data bytes
            self._read_until(b"OK", HTTP_TIMEOUT_S * 1000)

            # Execute POST; wait up to HTTP_TIMEOUT_S for +HTTPACTION
            resp = self._at("AT+HTTPACTION=1", "+HTTPACTION:", HTTP_TIMEOUT_S * 1000)

            # Parse status: "+HTTPACTION: 1,200,<bytes>"
            parts = resp.split("+HTTPACTION:")[1].strip().split(",")
            status = int(parts[1])
            return 200 <= status < 300

        except Exception:
            return False

        finally:
            self._at_quiet("AT+HTTPTERM")
