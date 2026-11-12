"""Build the selected labs in groups.

Pruning is opt-in for disposable CI runners. Normal local builds preserve images
and caches. Related Bitcoin images stay together to share their base layers.
"""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
GROUPS = [
    ("bitcoin", ["bitcoin", "bitcoin-tools", "bitcoin-graph"]),
    ("crypto", ["crypto"]),
    ("ethereum", ["ethereum"]),
    ("quiz", ["quiz"]),
    ("gateway", ["gateway"]),
]


def run(*args, capture=False):
    return subprocess.run(args, cwd=ROOT, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None)


def build(prune_cache=False):
    config = json.loads(run("docker", "compose", "config", "--format", "json", capture=True).stdout)
    image_for = lambda service: config["services"][service].get("image", config["name"] + "-" + service)
    if image_for("bitcoin") != image_for("bitcoin-peer"):
        raise ValueError("Both Bitcoin stations must use the same built image")
    for name, services in GROUPS:
        free = shutil.disk_usage(ROOT).free / 1024**3
        print(f"Building {name}: {free:.1f} GiB free on workspace disk", flush=True)
        run("docker", "compose", "--progress", "plain", "build", *services)
        if prune_cache:
            run("docker", "builder", "prune", "--all", "--force")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prune-cache", action="store_true")
    args = parser.parse_args()
    build(prune_cache=args.prune_cache)
