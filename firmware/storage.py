"""Offline flash queue: persist payloads when GPRS fails, flush on next wake."""

import uos
from config import QUEUE_MAX

_QUEUE_DIR = "/queue"


def _ensure_dir():
    try:
        uos.mkdir(_QUEUE_DIR)
    except OSError:
        pass  # already exists


def _queue_files() -> list:
    """Return sorted list of queued filenames (oldest first by name = timestamp)."""
    try:
        entries = uos.listdir(_QUEUE_DIR)
        return sorted(f for f in entries if f.endswith(".json"))
    except OSError:
        return []


def enqueue_payload(timestamp: str, json_str: str):
    """Write json_str to flash under a timestamp-keyed filename.

    Drops the oldest entry when the queue is at QUEUE_MAX capacity so the
    device never runs out of flash space during extended connectivity outages.
    """
    _ensure_dir()

    files = _queue_files()
    while len(files) >= QUEUE_MAX:
        oldest = files.pop(0)
        try:
            uos.remove(f"{_QUEUE_DIR}/{oldest}")
        except OSError:
            pass

    # Sanitise timestamp for use as a filename (replace colons)
    safe_ts = timestamp.replace(":", "-")
    path = f"{_QUEUE_DIR}/{safe_ts}.json"
    try:
        with open(path, "w") as f:
            f.write(json_str)
    except OSError:
        pass  # flash write failed — payload lost, not fatal


def flush_queue(modem) -> int:
    """Attempt to POST all queued payloads via modem.

    Deletes each file on success. Stops on first failure to avoid
    burning GPRS time when connectivity is marginal.
    Returns the number of payloads successfully flushed.
    """
    flushed = 0
    for filename in _queue_files():
        path = f"{_QUEUE_DIR}/{filename}"
        try:
            with open(path, "r") as f:
                json_str = f.read()
            ok = modem.http_post(json_str)
            if ok:
                uos.remove(path)
                flushed += 1
            else:
                break  # connectivity too poor — defer remainder
        except OSError:
            # Corrupt file — remove and continue
            try:
                uos.remove(path)
            except OSError:
                pass
    return flushed


def queue_depth() -> int:
    """Return the number of payloads currently waiting in the flash queue."""
    return len(_queue_files())
