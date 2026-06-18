"""In-memory offline queue — mirrors firmware/storage.py interface.

Payloads are held in a deque. The oldest entry is dropped when the
queue is at capacity, matching the firmware's flash queue behaviour.
"""

from collections import deque

_QUEUE_MAX = 48  # matches firmware QUEUE_MAX in config.py


class OfflineQueue:
    def __init__(self):
        self._queue: deque = deque()

    def enqueue(self, timestamp: str, json_str: str):
        while len(self._queue) >= _QUEUE_MAX:
            self._queue.popleft()
        self._queue.append((timestamp, json_str))

    def flush(self, post_fn) -> int:
        """Call post_fn(json_str) for each queued item, stopping on first failure."""
        flushed = 0
        while self._queue:
            _timestamp, json_str = self._queue[0]
            if post_fn(json_str):
                self._queue.popleft()
                flushed += 1
            else:
                break
        return flushed

    def depth(self) -> int:
        return len(self._queue)
