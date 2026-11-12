"""Regressions for missing CLI responses without suppressing real failures."""
from pathlib import Path
import subprocess
import sys
from unittest.mock import Mock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import zellij_state


def response(stdout="", stderr="", returncode=0):
    return subprocess.CompletedProcess(["zellij"], returncode, stdout, stderr)


@pytest.mark.parametrize("empty", ["", " \n\t"])
def test_retries_empty_success_then_returns_actual_state(monkeypatch, empty):
    runner = Mock(side_effect=[response(empty), response('[{"id": 7}]')])
    monkeypatch.setattr(zellij_state.subprocess, "run", runner)
    assert zellij_state.read_json("list-panes") == [{"id": 7}]
    assert runner.call_count == 2


def test_empty_json_list_is_valid_state(monkeypatch):
    runner = Mock(return_value=response("[]"))
    monkeypatch.setattr(zellij_state.subprocess, "run", runner)
    assert zellij_state.read_json("list-tabs") == []
    assert runner.call_count == 1


@pytest.mark.parametrize("result, message", [
    (response(stderr="No active session", returncode=1), "exited 1: No active session"),
    (response(stderr="Timeout listing panes"), "returned no state: Timeout listing panes"),
    (response("not JSON"), "Expecting value"),
    (response('{}'), "other than a list"),
])
def test_rejects_errors_without_retrying(monkeypatch, result, message):
    runner = Mock(return_value=result)
    monkeypatch.setattr(zellij_state.subprocess, "run", runner)
    with pytest.raises((RuntimeError, ValueError), match=message):
        zellij_state.read_json("list-panes")
    assert runner.call_count == 1


def test_empty_response_deadline_fails_without_inventing_state(monkeypatch):
    runner = Mock(return_value=response())
    monkeypatch.setattr(zellij_state.subprocess, "run", runner)
    with pytest.raises(TimeoutError, match="returned empty output"):
        zellij_state.read_json("list-tabs", timeout=0.01)
    assert runner.call_count >= 1


def test_hung_cli_is_bounded_and_not_retried(monkeypatch):
    runner = Mock(side_effect=subprocess.TimeoutExpired("zellij", 2))
    monkeypatch.setattr(zellij_state.subprocess, "run", runner)
    with pytest.raises(subprocess.TimeoutExpired):
        zellij_state.read_json("list-tabs")
    assert runner.call_count == 1
    assert 0 < runner.call_args.kwargs["timeout"] <= 2


def test_missing_active_pane_cannot_report_false_fullscreen(monkeypatch):
    monkeypatch.setenv("ZELLIJ_PANE_ID", "9")
    monkeypatch.setattr(zellij_state, "read_json", lambda _: [])
    with pytest.raises(StopIteration):
        zellij_state.report("fullscreen")
