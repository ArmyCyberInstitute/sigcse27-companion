#!/bin/sh
set -eu
flask --app app:create_app init-db
PYTHONPATH=/app python /usr/local/bin/seed_quizzes.py
exec "$@"
