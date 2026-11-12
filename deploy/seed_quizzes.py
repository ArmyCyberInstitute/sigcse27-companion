"""Idempotently load the public demonstration banks into the shared engine."""
import json
from pathlib import Path
from app import create_app
from app.ingest import ingest_json

app = create_app()
with app.app_context():
    banks = [json.loads(p.read_text()) for p in sorted(Path('/samples').glob('*-quiz-bank.json'))]
    ingest_json(json.dumps(banks), filename='publication-samples.json', actor_sub='shared-demo')
