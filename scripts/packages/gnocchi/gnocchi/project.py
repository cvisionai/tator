import argparse
import sys
import logging

import pytator

# QT Imports
from PyQt5 import Qt,QtCore, QtGui, QtWidgets, uic
from PyQt5.QtCore import pyqtSlot
from gnocchi.ui_project import Ui_Project
import qdarkstyle



class Project(QtWidgets.QMainWindow):
    def __init__(self):
        super(Project, self).__init__()
        self.ui = Ui_Project()
        self.ui.setupUi(self)

        # hide tab stuff at first
        self.ui.tabWidget.setVisible(False)
        self.adjustSize()
        

    @pyqtSlot()
    def on_actionExit_triggered(self):
        self.close()

    @pyqtSlot()
    def on_connectBtn_clicked(self):
        token=pytator.Auth.getToken('https://cvision.tatorapp.com/rest',
                                    self.ui.username_field.text(),
                                    self.ui.password_field.text())
        if token is None:
            logging.warning("Bad user credentials")
        else:
            logging.info("Acquired Token")

def start():
    parser = argparse.ArgumentParser(description='Camera Control Utility')
    parser.add_argument('--theme', default='dark',
                        choices=['dark', 'light'])
    args = parser.parse_args()
    """ Starts the camera control UI """
    app = QtWidgets.QApplication(sys.argv)
    if args.theme == 'dark':
        app.setStyleSheet(qdarkstyle.load_stylesheet_pyqt5())
    window = Project()
    window.show()
    sys.exit(app.exec())
