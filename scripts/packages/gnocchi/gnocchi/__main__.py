#!/usr/bin/env python3
""" Entry point """

import gnocchi.project
import logging
import sys

if __name__ == '__main__':
    logging.basicConfig(stream=sys.stdout, level=logging.INFO)
    gnocchi.project.start()
