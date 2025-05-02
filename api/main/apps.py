from django.apps import AppConfig
import logging
import os


def format_multiline_log_message(message):
    allow_multiline = os.getenv("TATOR_LOG_MULTI_LINE", "false").lower() == "true"
    if allow_multiline:
        return message
    else:
        return str(message).replace("\n", " \\n ").replace("\t", "    ")

class MultilineLogRecord(logging.LogRecord):
    def getMessage(self):
        message = super().getMessage()
        formatted_message = format_multiline_log_message(message)
        self.message = formatted_message
        return self.message

class MainConfig(AppConfig):
    name = "main"
    def ready(self):
        logging.setLogRecordFactory(MultilineLogRecord)
