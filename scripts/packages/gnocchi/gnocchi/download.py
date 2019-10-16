from PyQt5.QtCore import QObject, pyqtSignal,pyqtSlot
import os
import os.path
import pathlib

import logging
import time

class Download(QObject):
    """ Background thread to handle copying directories """

    progress = pyqtSignal(str, float)
    file_progress = pyqtSignal(str, float)
    finished = pyqtSignal(int)
    error = pyqtSignal(str)
    _trigger = pyqtSignal()

    def __init__(self, mediaList, outputDirectory):
        super(DownloadThread, self).__init__()
        self.output_dir = outputDirectory
        self._trigger.connect(self._process)
        self._terminated=True

    def start(self):
        self._terminated=False
        self._trigger.emit()
    def stop(self):
        self._terminated=True

    @pyqtSlot()
    def _process(self):
        self.finished.emit(0)
