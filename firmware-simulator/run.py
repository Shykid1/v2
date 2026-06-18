"""Entry point — spawn one Node thread per configured node and block."""

import signal
import sys
import time

import config
from node import Node, _COLORS, _RESET, _BOLD


def main():
    print(f"\n{_BOLD}SaniChain v2 Sensor Simulator{_RESET}")
    print(f"  API        : {config.API_URL}")
    print(f"  Time scale : {config.TIME_SCALE}x  "
          f"(1 sim hour = {3600 / config.TIME_SCALE:.0f}s real, "
          f"6h cycle = {6 * 3600 / config.TIME_SCALE:.0f}s real)")
    print(f"  Nodes      : {len(config.NODES)}")
    print(f"  Net fail   : {config.NETWORK_FAILURE_RATE * 100:.0f}%  "
          f"HTTP fail: {config.HTTP_FAILURE_RATE * 100:.0f}%")
    print()

    nodes = [
        Node(cfg, _COLORS[i % len(_COLORS)])
        for i, cfg in enumerate(config.NODES)
    ]

    for node in nodes:
        node.start()

    def _shutdown(sig, _frame):
        print(f"\n{_BOLD}Shutting down...{_RESET}")
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    while True:
        time.sleep(1)


if __name__ == "__main__":
    main()
