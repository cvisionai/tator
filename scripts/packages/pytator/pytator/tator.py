""" Python library for interacting with Tator REST API"""

import pytator.api as apiImpl

class Tator:
    """
    Top-level module for access Tator API endpoints
    """
    def __init__(self, url, token, project):
        self.Media = apiImpl.Media((url,token,project))
        self.LocalizationType = apiImpl.LocalizationType((url,token,project))
        self.StateType = apiImpl.StateType((url,token,project))
        self.State = apiImpl.State((url,token,project))
        self.Track = apiImpl.Track((url,token,project))
        self.Localization = apiImpl.Localization((url,token,project))
        self.TreeLeaf = apiImpl.TreeLeaf((url,token,project))
