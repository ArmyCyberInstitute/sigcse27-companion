.DEFAULT_GOAL := site
.PHONY: site quiz-bundle check package catalog container-package
catalog:
	python3 scripts/build_catalog.py
	python3 demos/bitcoin/build_ui.py
site: catalog
	quarto render
	python3 scripts/check_site.py
quiz-bundle:
	python3 quizes/build_quiz_bank_bundle.py
check: quiz-bundle catalog
	python3 scripts/check_release.py
	python3 scripts/check_public_material.py
package: check site
	python3 scripts/package_release.py
container-package:
	docker compose build gateway
	mkdir -p dist
	docker compose run --rm --no-deps -T --entrypoint cat gateway /usr/share/nginx/html/downloads/curriculum-source.zip > dist/curriculum-source.zip
