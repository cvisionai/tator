from PyQt5.QtCore import QObject, pyqtSignal,pyqtSlot
import os
import os.path
import pathlib

import logging
import time
import json

class Upload(QObject):
    """ Background thread to handle uploading content """

    progress = pyqtSignal(str, int, int)
    finished = pyqtSignal(int)
    error = pyqtSignal(str)
    _trigger = pyqtSignal()

    def __init__(self, tator, mediaList, section):
        super(Download, self).__init__()
        self.tator = tator
        self.section = section
        self.mediaList = mediaList
        self._trigger.connect(self._process)
        self._terminated=True

    def start(self):
        self._terminated=False
        self._trigger.emit()

    def stop(self):
        self._terminated=True

    @pyqtSlot()
    def _process(self):
        total = len(self.mediaList)
        for idx,media in enumerate(self.mediaList):
            self.progress.emit(f"{media['name']}", 0, idx)
            for chunk in self.tator.Media.uploadFile_v2(full_name,
                                                        section=self.section):
                if self._terminated:
                    return
                self.progress.emit(f"{media['name']}", 1, round(chunk))
            if self._terminated:
                return
        self.finished.emit(len(self.mediaList))
