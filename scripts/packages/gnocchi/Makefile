.PHONY: wheel
wheel: uic
	rm -fr build
	python3 setup.py bdist_wheel

.PHONY: uic
uic: gnocchi/ui_project.py gnocchi/ui_projectDetail.py gnocchi/ui_uploadDialog.py

gnocchi/ui_project.py: gnocchi/assets/project.ui
	pyuic5 gnocchi/assets/project.ui -o gnocchi/ui_project.py

gnocchi/ui_projectDetail.py: gnocchi/assets/project-detail.ui
	pyuic5 gnocchi/assets/project-detail.ui -o gnocchi/ui_projectDetail.py

gnocchi/ui_uploadDialog.py: gnocchi/assets/upload-dialog.ui
	pyuic5 gnocchi/assets/upload-dialog.ui -o gnocchi/ui_uploadDialog.py

.PHONY: install
install:
	pip3 install .

.PHONY: run
run: uic
	python3 -m gnocchi

ifeq ($(shell uname), "Linux")
SEP=:
OS_ARGS=
NAME=dropcam
else
SEP=;
OS_ARGS=-w --icon gnocchi/assets/cvision_no_text.ico
NAME="Gnocchi"
endif

.PHONY: dist
dist: uic
	pyinstaller -F $(OS_ARGS) -n $(NAME) --add-data "gnocchi/assets$(SEP)gnocchi/assets" --exclude-module numpy --exclude-module matplotlib --exclude-module pandas --exclude-module PIL --exclude-module PyQt5.QtOpenGL --exclude-module PyQt5.QtSql --exclude-module PyQt5.QtMultimedia --exclude-module PyQt5.QtTest --exclude-module PyQt5.QtWebEngineWidgets --exclude-module PyQt5.QtQuick --exclude-module PyQt5.QtQuickWidgets gnocchi/__main__.py
	mv $(NAME).spec build
