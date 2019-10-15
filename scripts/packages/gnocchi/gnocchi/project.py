import argparse
import sys
import logging

import pytator

# QT Imports
from PyQt5 import Qt,QtCore, QtGui, QtWidgets, uic
from PyQt5.QtCore import pyqtSlot
from gnocchi.ui_project import Ui_Project
from gnocchi.ui_projectDetail import Ui_ProjectDetail
import qdarkstyle



class ProjectDetail(QtWidgets.QWidget):
    def __init__(self, parent, url, token, projectId):
        super(ProjectDetail, self).__init__(parent)
        self.ui = Ui_ProjectDetail()
        self.ui.setupUi(self)
        self.project_id = projectId
        self.tator = pytator.Tator(url,
                                   token,
                                   self.project_id)
        self.ui.sectionTree.setHeaderLabel("Media Files")
        # Enable multiple selections
        self.ui.sectionTree.setSelectionMode(QtWidgets.QTreeWidget.MultiSelection)

    def refreshProjectData(self):
        project_data=self.tator.Project.get(self.project_id)
        self.ui.sectionTree.clear()
        self.sections = {}
        for section in project_data['section_order']:
            section_tree = QtWidgets.QTreeWidgetItem(self.ui.sectionTree)
            section_tree.setText(0,section)
            self.sections.update({section: {'widget': section_tree}})
            self.ui.sectionTree.addTopLevelItem(section_tree)

        self.parentWidget().repaint()
        for section in project_data['section_order']:
            medias = self.tator.Media.filter({"attribute":
                                              f"tator_user_sections::{section}"})
            section_tree = self.sections[section]['widget']
            self.sections[section]['medias'] = []
            if medias is None:
                continue
            for media in medias:
                media_item = QtWidgets.QTreeWidgetItem(section_tree)
                self.sections[section]['medias'].append(media_item)
                media_item.setText(0,media['name'])
            section_tree.addChildren(self.sections[section]['medias'])
            self.parentWidget().repaint()
            
                                 
        
    def showEvent(self, evt):
        super(ProjectDetail, self).showEvent(evt)
        QtCore.QTimer.singleShot(50,self.refreshProjectData)
        
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
            self.ui.login_widget.setVisible(False)

            tator=pytator.Tator('https://cvision.tatorapp.com/rest',
                                token,
                                None)
            projects=tator.Project.all()
            # TODO landing page
            self.ui.tabWidget.addTab(QtWidgets.QWidget(self), "Welcome")
            for project in projects:
                self.ui.tabWidget.addTab(
                    ProjectDetail(self,
                                  'https://cvision.tatorapp.com/rest',
                                  token,
                                  project['id']),
                    project['name'])
            self.ui.tabWidget.setVisible(True)
            self.adjustSize()
            screenGeometry = QtWidgets.QApplication.desktop().screenGeometry()
            marginLeft = (screenGeometry.width() - self.width()) / 2
            marginRight = (screenGeometry.height() - self.height()) / 2
            self.move(marginLeft, marginRight)

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
    screenGeometry = QtWidgets.QApplication.desktop().screenGeometry()
    marginLeft = (screenGeometry.width() - window.width()) / 2
    marginRight = (screenGeometry.height() - window.height()) / 2
    window.move(marginLeft, marginRight)
    window.show()
    sys.exit(app.exec())
