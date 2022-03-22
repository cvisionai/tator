from setuptools import setup, find_packages

import os.path

VERSION_FILE_PATH=os.path.join(os.path.dirname(__file__), 'version')
VERSION_FILE=open(VERSION_FILE_PATH,'r')
VERSION_NUMBER=VERSION_FILE.read()
VERSION_FILE.close()

setup(
    name="Gnocchi",
    version=VERSION_NUMBER,
    packages=find_packages(),
    scripts=[],

    # Project uses reStructuredText, so ensure that the docutils get
    # installed or upgraded on the target machine
    install_requires=['tator>=0.0.14',
                      'qdarkstyle==2.7'],

    # metadata to display on PyPI
    author="CVision AI",
    author_email="info@cvisionai.com",
    description="Native UI client for Tator Online REST API",
    keywords="tator",
    url="http://cloud.tator.io",   # project home page, if any
    #project_urls={
    #    "Bug Tracker": "https://bugs.example.com/HelloWorld/",
    #    "Documentation": "https://docs.example.com/HelloWorld/",
    #    "Source Code": "https://code.example.com/HelloWorld/",
    #},
    classifiers=[
        'License :: OSI Approved :: MIT License'
    ]

    # could also include long_description, download_url, etc.
)
