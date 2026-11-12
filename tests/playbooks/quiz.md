# Quiz builder

Open `/quiz/instructor/` and use a separate browser context for `/quiz/student/`.

1. Confirm that the three sample banks are available. Create a template and generate a three-question quiz from a selected lesson.
2. Review and edit a generated question, then publish the quiz.
3. Enroll a synthetic student, save the identifier, and open the published quiz. Answer its questions, leave and resume the attempt, then submit.
4. Confirm that the attempt is graded and the displayed score matches its selected answers. Check the instructor results and supported export.
5. Try answering after submission and starting an additional attempt beyond the limit. Verify the documented restrictions and preserved result.

The automated workflow creates and publishes a quiz through the instructor API, then enrolls, answers, and submits through the student browser UI. It verifies the stored graded attempt through the API. The quiz engine's unit and integration tests cover selection, editing, attempt limits, grading, and exports in greater depth.
