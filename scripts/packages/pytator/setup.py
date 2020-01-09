from setuptools import setup, find_packages

import os.path

VERSION_FILE_PATH=os.path.join(os.path.dirname(__file__), 'version')
VERSION_FILE=open(VERSION_FILE_PATH,'r')
VERSION_NUMBER=VERSION_FILE.read()
VERSION_FILE.close()

setup(
    name="PyTator",
    version=VERSION_NUMBER,
    packages=find_packages(),
    scripts=['ingestor.py', 'tator_testHarness.py', 'sendProgress.py'],

    # Project uses reStructuredText, so ensure that the docutils get
    # installed or upgraded on the target machine
    install_requires=['requests>=2.21.0',
                      'progressbar2>=3.42.0',
                      'tuspy>=0.2.4',
                      'pandas>=0.24.2'],

    # metadata to display on PyPI
    author="CVision AI",
    author_email="info@cvisionai.com",
    description="Python Bindings for Tator Online REST API",
    keywords="tator",
    url="http://cvision.tatorapp.com",   # project home page, if any
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
