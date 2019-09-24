#!/usr/bin/env python3

""" Script to emulate tator online for testing setup/teardown scripts 

:testConfig: refers to a file with the following content
{
  "TATOR_AUTH_TOKEN": "<token>",
  "TATOR_PROJECT_ID": "2",
  "TATOR_API_SERVICE": "https://cvision.tatorapp.com/rest",
  "TATOR_MEDIA_IDS": "2474847"
}

*Example*:

tator_testHarness.py config.json myProject/tator/setup.py

"""

import argparse
import subprocess
import os
import json

if __name__=="__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("testConfig", type=argparse.FileType('r'))
    parser.add_argument("script",
                        help="setup or teardown script")
    parser.add_argument("--workDir")
    args = parser.parse_args()
    test_config = json.load(args.testConfig)
    if args.workDir:
        test_config["TATOR_WORK_DIR"] = args.workDir
    else:
        test_config["TATOR_WORK_DIR"] = os.path.join(os.getcwd(), "tmp")
        
    subprocess.run(f"python3 {args.script}".split(),
                   env=test_config)
