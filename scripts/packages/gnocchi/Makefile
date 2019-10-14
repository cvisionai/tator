.PHONY: wheel
wheel: uic
	rm -fr build
	python3 setup.py bdist_wheel

.PHONY: uic
uic: gnocchi/ui_project.py #gnocchi/ui_projectDetail.py

gnocchi/ui_project.py: gnocchi/assets/project.ui
	pyuic5 gnocchi/assets/project.ui -o gnocchi/ui_project.py

gnocchi/ui_projectDetail.py: gnocchi/assets/project-detail.ui
	pyuic5 gnocchi/assets/project-detail.ui -o gnocchi/ui_projectDetail.py

.PHONY: install
install:
	pip3 install .

.PHONY: run
run: uic
	python3 -m gnocchi
