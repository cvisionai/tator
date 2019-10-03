""" Python library for interacting with Tator REST API"""

import pytator.api as apiImpl
import argparse

def cli_parser():
    """ Returns an argument parser with project required arguments """
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--token", required=True)
    return parser

class Tator:
    """
    Top-level module for access Tator API endpoints
    """
    def __init__(self, url, token, project):
        self.project = project
        self._url = url
        self.Media = apiImpl.Media((url,token,project))
        self.MediaType = apiImpl.MediaType((url,token,project))
        self.LocalizationType = apiImpl.LocalizationType((url,token,project))
        self.StateType = apiImpl.StateType((url,token,project))
        self.State = apiImpl.State((url,token,project))
        self.Track = apiImpl.Track((url,token,project))
        self.Localization = apiImpl.Localization((url,token,project))
        self.TreeLeaf = apiImpl.TreeLeaf((url,token,project))

    def baseURL(self):
        """ Returns the URL for accessing site content """
        remove_rest = self._url.replace("/rest", "")
        return remove_rest + "/"
