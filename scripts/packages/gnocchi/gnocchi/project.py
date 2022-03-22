import argparse
import sys
import logging

import tator
import traceback
import os

# QT Imports
from PyQt5 import Qt,QtCore, QtGui, QtWidgets, uic
from PyQt5.QtCore import pyqtSlot
from gnocchi.ui_project import Ui_Project
from gnocchi.ui_projectDetail import Ui_ProjectDetail
from gnocchi.ui_uploadDialog import Ui_UploadDialog
from gnocchi.download import Download
from gnocchi.upload import Upload
import qdarkstyle

DIRNAME = os.path.dirname(os.path.abspath(__file__))
QT_ICON_PATH = os.path.join(DIRNAME, 'assets', 'cvision_no_text.ico')
QT_DOWNLOAD_PATH = os.path.join(DIRNAME, 'assets', 'download.svg')
QT_UPLOAD_PATH = os.path.join(DIRNAME, 'assets', 'upload.svg')
QT_SEARCH_PATH = os.path.join(DIRNAME, 'assets', 'search.svg')

class UploadDialog(QtWidgets.QDialog):
    def __init__(self, parent, tator_api, project_id,
                 sectionNames, backgroundThread):
        super(UploadDialog, self).__init__(parent)
        self.ui = Ui_UploadDialog()
        self.ui.setupUi(self)
        self.background_thread = backgroundThread
        self.tator_api = tator_api
        self.project_id = project_id
        self.setModal(True)
        self.ui.sectionSelection.addItem("New Section")
        self.ui.sectionSelection.addItems(sectionNames)
        self.setMode('select')
        self.section = None
        self.upload = None

    def keyPressEvent(self, evt):
        if (evt.key() in [QtCore.Qt.Key_Enter, QtCore.Qt.Key_Return]):
            return
        else:
            super(UploadDialog,self).keyPressEvent(evt)

    def setMode(self,mode):
        if mode not in ['upload', 'select']:
            raise Exception('Unknown Mode')

        if mode == 'upload':
            upload=True
            select=False
            self.setWindowTitle(f"Ready to Upload {len(self.media_files)} to '{self.section}'")
        else:
            upload=False
            select=True
            self.setWindowTitle("Select files for Upload")

        self.ui.fileUploadProgress.setVisible(upload)
        self.ui.fileProgress_label.setVisible(upload)
        self.ui.totalProgress.setVisible(upload)
        self.ui.totalProgress_label.setVisible(upload)

        self.ui.files_label.setVisible(select)
        self.ui.section_label.setVisible(select)
        self.ui.sectionSelection.setVisible(select)
        self.ui.browseBtn.setVisible(select)


    def hideEvent(self, evt):
        if self.upload:
            self.upload.stop()
            del self.upload

    @pyqtSlot()
    def on_browseBtn_clicked(self):
        my_documents=Qt.QStandardPaths.writableLocation(
            Qt.QStandardPaths.DocumentsLocation)
        self.media_files,_ =QtWidgets.QFileDialog.getOpenFileNames(
            self,
            f"Select files to upload",
            my_documents,
            "Videos (*.mp4 *.mov);;Images (*.png *.jpg *.jpe *.gif);;All Files (*)")
        if self.media_files:
            print(f"Uploading {self.media_files}")
            self.uploadBtn = self.ui.buttonBox.addButton("Upload", QtWidgets.QDialogButtonBox.ActionRole)
            self.uploadBtn.clicked.connect(self.on_upload_clicked)
            self.section = self.ui.sectionSelection.currentText()
            self.setMode('upload')
            self.ui.totalProgress.setMaximum(len(self.media_files))

    def on_upload_clicked(self):
        self.uploadBtn.setEnabled(False)
        self.upload = Upload(self.tator_api,
                             self.project_id,
                             self.media_files,
                             self.section)
        self.upload.progress.connect(self.on_progress)
        self.upload.finished.connect(self.on_finish)
        self.upload.error.connect(self.on_error)
        self.upload.moveToThread(self.background_thread)
        self.upload.start()

    @pyqtSlot(str, int, int)
    def on_progress(self, msg, progress_type, count):
        if progress_type == 0:
            self.ui.totalProgress.setValue(count)
            self.ui.fileUploadProgress.reset()
            self.ui.fileUploadProgress.setValue(0)
            self.ui.fileUploadProgress.setFormat("%p%")
            self.ui.fileUploadProgress.text = None
        elif progress_type == 1:
            self.ui.fileUploadProgress.setFormat(f"{msg} (%p%)")
            self.ui.fileUploadProgress.setValue(count)

    @pyqtSlot(int)
    def on_finish(self, count):
        self.ui.totalProgress.setValue(count)
        QtWidgets.QMessageBox.information(self, "Upload Finished", f"{count} files uploaded.")
        del self.upload
        self.upload = None
        self.hide()

    @pyqtSlot(str)
    def on_error(self, msg):
        QtWidgets.QMessageBox.critical(self, "Upload Failed!", msg)


class ProjectDetail(QtWidgets.QWidget):
    def __init__(self, parent, backgroundThread, url, token, projectId):
        super(ProjectDetail, self).__init__(parent)
        self.background_thread = backgroundThread
        self.ui = Ui_ProjectDetail()
        self.ui.setupUi(self)
        self.project_id = projectId
        self.tator_api = tator.get_api(url,
                                       token)
        self.ui.sectionTree.setHeaderLabel("Media Files")
        # Enable multiple selections
        self.ui.sectionTree.setSelectionMode(QtWidgets.QTreeWidget.MultiSelection)

        self.ui.downloadBtn.setIcon(QtGui.QIcon(QT_DOWNLOAD_PATH))
        self.ui.uploadBtn.setIcon(QtGui.QIcon(QT_UPLOAD_PATH))
        self.ui.searchBtn.setIcon(QtGui.QIcon(QT_SEARCH_PATH))

        # Upload button is always active, download requires selection
        self.ui.uploadBtn.setEnabled(True)
        self.ui.downloadBtn.setEnabled(False)

        self.ui.sectionTree.itemSelectionChanged.connect(self.onSelectionChanged)

        self.ui.searchEdit.returnPressed.connect(self.refreshProjectData)
        self.ui.searchBtn.clicked.connect(self.refreshProjectData)
    @pyqtSlot()
    def onSelectionChanged(self):
        selected_items = self.ui.sectionTree.selectedItems()
        if len(selected_items):
            self.ui.downloadBtn.setEnabled(True)
        else:
            self.ui.downloadBtn.setEnabled(False)

    @pyqtSlot()
    def on_uploadBtn_clicked(self):
        upload_dialog = UploadDialog(self,
                                     self.tator_api,
                                     self.project_id,
                                     list(self.sections.keys()),
                                     self.background_thread)
        upload_dialog.show()

    @pyqtSlot()
    def on_downloadBtn_clicked(self):
        selected_items = self.ui.sectionTree.selectedItems()
        download_list = []
        def addSelfAndChildren(obj):
            if obj.data(0,0x100):
                download_list.append(obj.data(0,0x100))
            for child_idx in range(obj.childCount()):
                addSelfAndChildren(obj.child(child_idx))

        for item in selected_items:
            addSelfAndChildren(item)

        file_count = len(download_list)
        logging.info(f"Selected {file_count} for download.")

        my_documents=Qt.QStandardPaths.writableLocation(
            Qt.QStandardPaths.DocumentsLocation)
        output_directory=QtWidgets.QFileDialog.getExistingDirectory(
            self,
            f"Save {file_count} Files to...",
            my_documents)

        if output_directory:
            logging.info(f"Saving to {output_directory}")
            self.download = Download(self.tator_api,
                                     self.project_id,
                                     download_list,
                                     output_directory)
            self.download.progress.connect(self.download_progress)
            self.download.finished.connect(self.download_finished)
            self.download.moveToThread(self.background_thread)
            self.download_dialog = QtWidgets.QProgressDialog(
                "Downloading project...",
                "Cancel",
                0,
                file_count,
                self)
            self.download_dialog.setWindowTitle("Downloading Project...")
            self.download.start()
            self.download_dialog.setMinimumDuration(0)
            self.download_dialog.setValue(0)
            self.download_dialog.setMaximum(1000)
            self.download_dialog.canceled.connect(self.download_stopped)

    @pyqtSlot()
    def download_stopped(self):
        logging.info("Stopping download")
        self.download.stop()
        self.download_dialog.reset()

    @pyqtSlot(str, int)
    def download_progress(self, filename, idx):
        logging.info(f"Got download progress @ {idx}")
        self.download_dialog.setValue(idx)
        self.download_dialog.setLabelText(f"{filename}")

    @pyqtSlot(int)
    def download_finished(self, idx):
        logging.info("Download complete")
        self.download_dialog.reset()

    @pyqtSlot()
    def refreshProjectData(self):
        project_data = self.tator_api.get_project(self.project_id).to_dict()
        self.ui.sectionTree.clear()
        self.sections = {}
        section_data = self.tator_api.get_media_sections(self.project_id)
        for section in section_data:
            section_tree = QtWidgets.QTreeWidgetItem(self.ui.sectionTree)
            section_tree.setText(0,section)
            self.sections[section] = {'widget': section_tree}
            self.ui.sectionTree.addTopLevelItem(section_tree)

        self.parentWidget().repaint()
        number_of_sections = len(section_data)

        progress_dialog = QtWidgets.QProgressDialog("Loading project...",
                                                    "Cancel",
                                                    0,
                                                    100,
                                                    self)

        progress_dialog.setWindowTitle("Loading Project...")
        progress_dialog.setMinimumDuration(0)
        progress_dialog.setValue(33)
        progress_dialog.setModal(True)
        progress_dialog.setWindowModality(QtCore.Qt.ApplicationModal)
        self.progress_dialog = progress_dialog
        QtCore.QTimer.singleShot(50,self.load_media)
    def load_media(self):
        filter_string = self.ui.searchEdit.text().strip()
        if filter_string == "":
            all_medias = self.tator_api.get_media_list(self.project_id)
            self.ui.sectionTree.setHeaderLabel("Media Files")
        else:
            all_medias = self.tator_api.get_media_list({"search": filter_string})
            self.ui.sectionTree.setHeaderLabel(f"Media Files ({filter_string})")
        self.progress_dialog.setMinimum(0)
        self.progress_dialog.setMaximum(len(all_medias))
        idx = 1
        total = len(all_medias)
        for media in all_medias:
            section_name = media.attributes['tator_user_sections']
            parent = self.sections[section_name]['widget']
            media_item = QtWidgets.QTreeWidgetItem(parent)
            media_item.setData(0,0x100,media)
            media_item.setText(0,media.name)
            # Handle progress dialog
            self.progress_dialog.setValue(idx)
            idx += 1
            if self.progress_dialog.wasCanceled():
                return

    def showEvent(self, evt):
        super(ProjectDetail, self).showEvent(evt)
        QtCore.QTimer.singleShot(50,self.refreshProjectData)

class Project(QtWidgets.QMainWindow):
    def __init__(self, url):
        super(Project, self).__init__()
        self.ui = Ui_Project()
        self.ui.setupUi(self)
        self.setWindowIcon(QtGui.QIcon(QT_ICON_PATH))
        self.url = url

        # hide tab stuff at first
        self.ui.tabWidget.setVisible(False)
        self.adjustSize()
        self.background_thread=QtCore.QThread(self)
        self.background_thread.start()
        self.ui.password_field.returnPressed.connect(self.on_connectBtn_clicked)
        self.ui.username_field.returnPressed.connect(self.on_connectBtn_clicked)



    @pyqtSlot()
    def on_actionExit_triggered(self):
        self.close()

    @pyqtSlot()
    def on_connectBtn_clicked(self):
        tator_api=tator.get_api(self.url)
        credentials={'username': self.ui.username_field.text(),
                     'password': self.ui.password_field.text()}
        try:
            token=tator_api.create_obtain_auth_token(credentials=credentials)
            self.ui.login_widget.setVisible(False)

            tator_api=tator.get_api(self.url,
                                    token.token)
            projects=tator_api.get_project_list()
            projects=[x.to_dict() for x in projects]
            # TODO landing page
            self.ui.tabWidget.addTab(QtWidgets.QWidget(self), "Welcome")
            for project in projects:
                self.ui.tabWidget.addTab(
                    ProjectDetail(self,
                                  self.background_thread,
                                  self.url,
                                  token.token,
                                  project['id']),
                    project['name'])
            self.ui.tabWidget.setVisible(True)
            self.adjustSize()
            screenGeometry = QtWidgets.QApplication.desktop().screenGeometry()
            marginLeft = (screenGeometry.width() - self.width()) / 2
            marginRight = (screenGeometry.height() - self.height()) / 2
            self.move(marginLeft, marginRight)
        except Exception as e:
            traceback.print_exc()
            logging.warning("Access Denied")
            QtWidgets.QMessageBox.critical(self,"Access Denied","Please check your username and password.")

def start():
    parser = argparse.ArgumentParser(description='Gnocchi --- The PyTator GUI')
    parser.add_argument('--theme', default='dark',
                        choices=['dark', 'light'])
    parser.add_argument('--url', default='https://cloud.tator.io')
    args = parser.parse_args()
    """ Starts the camera control UI """
    app = QtWidgets.QApplication(sys.argv)
    if args.theme == 'dark':
        app.setStyleSheet(qdarkstyle.load_stylesheet_pyqt5())
    window = Project(args.url)
    screenGeometry = QtWidgets.QApplication.desktop().screenGeometry()
    marginLeft = (screenGeometry.width() - window.width()) / 2
    marginRight = (screenGeometry.height() - window.height()) / 2
    window.move(marginLeft, marginRight)
    window.show()
    sys.exit(app.exec())
