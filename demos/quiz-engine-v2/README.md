# Quiz engine

A Flask and SQLite application for question-bank management, template-based quiz generation, student attempts, grading, and results export.

From the repository root, run `docker compose up`. Open http://localhost:8080/quiz/instructor/ for the shared instructor demonstration. The sample banks load at startup.

See the [demonstration guide](../../docs/DEMOS.md) for the instructor/student workflow and test commands, and the [authoring specification](../../quizes/QUIZ_ENGINE_JSON_SPEC.md) for question-bank JSON. The local profile stores its database in the `quiz-data` Docker volume and receives a fixed demonstration instructor context from the gateway. Other authentication adapters are available in the application source.
