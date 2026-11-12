FROM python:3.12-slim
WORKDIR /app
COPY demos/quiz-engine-v2/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY demos/quiz-engine-v2/app ./app
COPY demos/quiz-engine-v2/instructor_auth ./instructor_auth
COPY quizes/quiz_json /samples
COPY deploy/seed_quizzes.py /usr/local/bin/seed_quizzes.py
COPY --chmod=755 deploy/quiz-entrypoint.sh /usr/local/bin/quiz-entrypoint
RUN mkdir -p /data && chown -R 10001:0 /data /app
USER 10001
ENV QUIZ_ENGINE_DB_PATH=/data/quiz-engine.sqlite
ENTRYPOINT ["/usr/local/bin/quiz-entrypoint"]
CMD ["flask", "--app", "app:create_app", "run", "--host=0.0.0.0", "--port=8000"]
