"""Read Zellij state, tolerating its successful-but-empty query response."""
import json
import os
import subprocess
import sys
import time


def read_json(action, timeout=5):
    deadline = time.monotonic() + timeout
    attempts = 0
    while time.monotonic() < deadline:
        result = subprocess.run(
            ["zellij", "action", action, "--json"], capture_output=True,
            text=True, timeout=min(2, max(0.001, deadline - time.monotonic())),
        )
        attempts += 1
        if result.returncode:
            raise RuntimeError(f"{action} exited {result.returncode}: {result.stderr.strip()}")
        if result.stdout.strip():
            rows = json.loads(result.stdout)
            if not isinstance(rows, list):
                raise ValueError(f"{action} returned a JSON value other than a list")
            return rows
        if result.stderr.strip():
            raise RuntimeError(f"{action} returned no state: {result.stderr.strip()}")
        # https://github.com/zellij-org/zellij/issues/5382
        # Only retry empty, successful reads. Errors and malformed JSON fail.
        time.sleep(min(0.1, max(0, deadline - time.monotonic())))
    raise TimeoutError(f"{action} returned empty output after {attempts} reads in {timeout}s")


def report(mode):
    if mode == "counts":
        tabs = read_json("list-tabs")
        panes = read_json("list-panes")
        print(f"COUNTS={len(tabs)},{sum(not pane['is_plugin'] for pane in panes)}")
    elif mode == "fullscreen":
        panes = read_json("list-panes")
        pane = next(p for p in panes if not p["is_plugin"] and str(p["id"]) == os.environ["ZELLIJ_PANE_ID"])
        if not isinstance(pane["is_fullscreen"], bool):
            raise ValueError("Pane fullscreen state must be a boolean")
        print("FULLSCREEN=" + str(pane["is_fullscreen"]).lower())
    else:
        raise ValueError(f"Unknown state query: {mode}")


if __name__ == "__main__":
    try:
        report(sys.argv[1])
    except Exception as error:
        print(f"Zellij state query failed: {type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(1)
