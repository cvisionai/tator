from setuptools import setup, find_packages

import os.path
import pytator

setup(
    name="PyTator",
    version=pytator.__version__,
    packages=find_packages(),
    scripts=['ingestor.py', 'tator_testHarness.py', 'sendProgress.py'],

    # Project uses reStructuredText, so ensure that the docutils get
    # installed or upgraded on the target machine
    install_requires=['requests>=2.21.0',
                      'progressbar2>=3.42.0',
                      'tator_tuspy>=0.2.5',
                      'pandas>=0.24.2',
                      'opencv-python>=4.1.0',
                      'numpy>=1.16.0'],

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
