.PHONY: wheel
wheel: uic
	rm -fr build
	python3 setup.py bdist_wheel

.PHONY: uic
uic: gnocchi/ui_project.py

gnocchi/ui_project.py: gnocchi/assets/project.ui
	pyuic5 gnocchi/assets/project.ui -o gnocchi/ui_project.py

.PHONY: install
install:
	pip3 install .

