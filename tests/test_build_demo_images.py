"""Check grouped CI builds without pruning the host."""
import importlib.util
import json
from pathlib import Path
import subprocess

import pytest

spec = importlib.util.spec_from_file_location("build_demo_images", Path(__file__).resolve().parents[1] / "scripts/build_demo_images.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


@pytest.fixture
def docker(monkeypatch, tmp_path):
    calls = []
    config = {"name": "paper-companion", "services": {name: {} for _, names in builder.GROUPS for name in names}}
    config["services"]["bitcoin"]["image"] = "paper-companion-bitcoin"
    config["services"]["bitcoin-peer"] = {"image": "paper-companion-bitcoin"}

    def run(*args, capture=False):
        calls.append(args)
        return subprocess.CompletedProcess(args, 0, stdout=json.dumps(config))

    monkeypatch.setattr(builder, "ROOT", tmp_path)
    monkeypatch.setattr(builder, "run", run)
    return calls, config


def test_local_build_preserves_existing_images_and_caches(docker):
    calls, _ = docker
    builder.build()
    assert not any("prune" in args or "rm" in args for args in calls)
    assert any(args[-3:] == ("bitcoin", "bitcoin-tools", "bitcoin-graph") for args in calls)


def test_ci_prunes_cache_after_each_successful_build(docker):
    calls, _ = docker
    builder.build(prune_cache=True)
    expected = [("docker", "compose", "config", "--format", "json")]
    for _, services in builder.GROUPS:
        expected.append(("docker", "compose", "--progress", "plain", "build", *services))
        expected.append(("docker", "builder", "prune", "--all", "--force"))
    assert calls == expected


def test_both_bitcoin_stations_require_a_shared_image(docker):
    calls, config = docker
    config["services"]["bitcoin-peer"]["image"] = "different-image"
    with pytest.raises(ValueError, match="same built image"):
        builder.build()
    assert len(calls) == 1


def test_failed_build_stops_before_pruning_or_building_other_groups(docker, monkeypatch):
    calls, _ = docker
    original_run = builder.run
    def run(*args, capture=False):
        result = original_run(*args, capture=capture)
        if "build" in args:
            raise subprocess.CalledProcessError(1, args)
        return result

    monkeypatch.setattr(builder, "run", run)
    with pytest.raises(subprocess.CalledProcessError):
        builder.build(prune_cache=True)
    assert len(calls) == 2
    assert not any("prune" in args or "rm" in args for args in calls)
