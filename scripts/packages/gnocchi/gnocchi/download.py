from PyQt5.QtCore import QObject, pyqtSignal,pyqtSlot
import os
import os.path
import pathlib

import logging
import time
import json

class Download(QObject):
    """ Background thread to handle copying directories """

    progress = pyqtSignal(str, int)
    finished = pyqtSignal(int)
    error = pyqtSignal(str)
    _trigger = pyqtSignal()

    def __init__(self, tator, mediaList, outputDirectory):
        super(Download, self).__init__()
        self.tator = tator
        self.output_dir = outputDirectory
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
        idx = 0
        total = len(self.mediaList)
        for media in self.mediaList:
            self.progress.emit(f"{media['name']} ({idx}/{total})", idx)
            section_name = media['attributes'].get('tator_user_sections','No Section')
            full_directory = os.path.join(self.output_dir, section_name)
            os.makedirs(full_directory, exist_ok=True)
            full_name = os.path.join(full_directory, media['name'])
            self.tator.Media.downloadFile(media, full_name)

            # Fetch state types and for this media
            state_types = self.tator.StateType.filter({"media_id": media['id']})
            for dbType in state_types:
                type_id = dbType['type']['id']
                type_name = dbType['type']['name']
                type_dir = os.path.join(full_directory, type_name)
                os.makedirs(type_dir, exist_ok=True)
                type_file = f"{media['name']}.json"
                full_type_path = os.path.join(type_dir, type_file)
                elements = self.tator.State.filter({"media_id": media['id'],
                                                    "type": type_id})
                if elements is None:
                    continue

                with open(full_type_path, 'w') as output:
                    json.dump(elements, output)

            # Now export localizations
            local_types = self.tator.LocalizationType.filter({"media_id": media['id']})
            for dbType in local_types:
                type_id = dbType['type']['id']
                type_name = dbType['type']['name']
                type_dir = os.path.join(full_directory, type_name)
                os.makedirs(type_dir, exist_ok=True)
                type_file = f"{media['name']}.json"
                full_type_path = os.path.join(type_dir, type_file)
                elements = self.tator.Localization.filter(
                    {"media_id": media['id'],
                     "type": type_id})
                if elements is None:
                    continue

                with open(full_type_path, 'w') as output:
                    json.dump(elements, output)

            idx += 1
            if self._terminated:
                return
        self.finished.emit(len(self.mediaList))
