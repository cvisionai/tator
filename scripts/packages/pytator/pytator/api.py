""" API Implementation Module

The implementation of each endpoint type is in this module. Each type derives
off of APIElement, which provides basic functions such as APIElement.get() and
APIElement.new().

Some endpoints classes have additional methods that are specific to it, such
as Media which provides :class:`Media.uploadFile` and :class:`Media.downloadFile`

These endpoints do not need to be manually constructed and instead can be
accessed via :class:`pytator.Tator`.

 """
import json
import math
import requests
import time
import os
import progressbar
import pandas as pd

from pytator.md5sum import md5_sum
from itertools import count
from tusclient.client import TusClient
from urllib.parse import urljoin
from urllib.parse import urlsplit
from uuid import uuid1

class APIElement:
    """ Base API element that provides generic capability to any of the
        derived endpoint objects. Each Element is instantiated per project
        so concepts of `all` refer to `all` within a project.

    :param api: Tuple provided from :class:`pytator.Tator` object construction, represents the Tator webservice endpoint, authorization token, and project number.
    :param str endpoint: Name of the endpoint provided from derived class.
    """
    def __init__(self, api, list_endpoint, detail_endpoint):
        """ Construct an API element. Constructed by :class:`pytator.Tator`
        """
        self.endpoint = list_endpoint
        self.individual_endpoint = detail_endpoint
        self.url = api[0].rstrip('/')
        self.token = str(api[1])
        if api[2]:
            self.project = str(api[2])
        else:
            self.project = None
        self.headers={"Authorization" : "Token {}".format(self.token),
                      "Content-Type": "application/json",
                      "Accept-Encoding": "gzip"}

    def getMany(self, endpoint, params):
        """
        Returns a list of elements at a given endpoint.

        .. deprecated:: 0.0.2
           Do not call this function directly,
           use :func:`APIElement.filter` or :func:`APIElement.all` instead

        """
        obj = []
        try:
            if self.project:
                ep = self.url + "/" + endpoint+"/"+self.project
            else:
                ep = self.url + "/" + endpoint
            response=requests.get(ep,
                                  params=params,
                                  headers=self.headers)
            if response.status_code == 200:
                jsonList=response.json()
                if (len(jsonList) >= 1):
                    obj = jsonList
            else:
                print(f"ERROR {response.status_code}: got {response.text}")
        except Exception as e:
            print(e)
        finally:
            return obj

    def filter(self, params):
        """ Given a filter object, return the matching elements (or None)

        Filtering may require knowledge of the underlying user-defined type. See
        `rest/EntityTypeSchema`.

        """
        return self.getMany(self.endpoint, params)

    def dataframe(self, params):
        """ Given a filter object, return the matching elements as a
        pd.DataFrame or None.

        This function is equivilant to the following: ::

           allObjects=self.filter(params)
           if allObjects:
               return pd.DataFrame(data=allObjects,
                                columns=allObjects[0].keys())
           else:
               return None

        """
    def all(self):
        """ Get list of all the elements of an endpoint as a list

            :return: None if there are no elements, else a list

        """
        return self.getMany(self.endpoint, None)

    def bulk_update(self, params, patch):
        """ Given a filter and patch object, update the matching elements.

            :param params: Query parameters for the objects to be updated.
            :param patch: Object attributes to apply.

            :return: A tuple containing the status code and JSON response from server
        """
        try:
            ep = self.url + "/" + self.endpoint + "/" + self.project
            response = requests.patch(ep,
                                      params=params,
                                      json=patch,
                                      headers=self.headers)
            if response.status_code >= 300 or response.status_code < 200:
                print(f"ERROR {response.status_code}: got {response.text}")
        except Exception as e:
            print(e)
        finally:
            return (response.status_code, response.json())

    def bulk_delete(self, params):
        """ Given a filter object, delete the matching elements.

            :param params: Query parameters for the objects to be deleted.

            :return: A tuple containing the status code and JSON response from server
        """
        try:
            ep = self.url + "/" + self.endpoint + "/" + self.project
            response = requests.delete(ep,
                                       params=params,
                                       headers=self.headers)
            if response.status_code >= 300 or response.status_code < 200:
                print(f"ERROR {response.status_code}: got {response.text}")
        except Exception as e:
            print(e)
        finally:
            return response.status_code

    def update(self, pk, patch):
        """ Update an element. To understand what fields apply to a given
            object type, `rest/EntityTypeSchema/<type id>` can be used.

            :param int pk: ID of element to update
            :param dict patch: Object delta to apply

            :return: A tuple of the status code and JSON response from server
        """
        endpoint=self.url + "/" + self.individual_endpoint + "/" + str(pk)
        response=requests.patch(endpoint,
                               json=patch,
                               headers=self.headers)
        if response.status_code >= 300 or response.status_code < 200:
            try:
                msg=response.json()
                print("Error: {}\nDetails: {}".format(msg['message'],
                                                      msg['details']))
            except:
                print("Error: {}".format(response.text))

        return (response.status_code, response.json())

    def get(self, pk):
        """ Acquire an individual item from the database.

        :param int pk: The id of the object to acquire
        :return: A python dictionary representing the object
        """
        endpoint=self.url + "/" + self.individual_endpoint + "/" + str(pk)
        response=requests.get(endpoint,
                              headers=self.headers)
        if response.status_code >= 300 or response.status_code < 200:
            try:
                msg=response.json()
                print("Error: {}\nDetails: {}".format(msg['message'],
                                                      msg['details']))
            except:
                print("Error: {}".format(response.text))
            return None

        return response.json()

    def delete(self, pk):
        """ Delete an individual object from the database.
        
        :param int pk: The id of the object to delete
        :return: A status code from server
        """
        endpoint=self.url + "/" + self.individual_endpoint + "/" + str(pk)
        response=requests.delete(endpoint,
                                 headers=self.headers)
        if response.status_code >= 300 or response.status_code < 200:
            try:
                msg=response.json()
                print("Error: {}\nDetails: {}".format(msg['message'],
                                                      msg['details']))
            except:
                print("Error: {}".format(response.text))
            return 0

        return response.status_code

    def new(self, obj):
        """ Add a new object to the database.

        To understand what fields apply to a given object type,
        `rest/EntityTypeSchema/<type id>` can be used.

        :param dict obj: The object to add to the database.
        """
        if self.project:
            ep = self.url + "/" + self.endpoint + "/" + self.project
        else:
            ep = self.url + "/" + self.endpoint
        response=requests.post(ep,
                               json=obj,
                               headers=self.headers)
        if response.status_code >= 300 or response.status_code < 200:
            try:
                msg=response.json()
                print("Error: {}\nDetails: {}".format(msg['message'],
                                                      msg['details']))
            except:
                print("Error: {}".format(response.text))

        return (response.status_code, response.json())

    def getSingleElement(self, endpoint, params):
        """ Shortcut method to get the first element from a list

        .. deprecated:: 0.0.2
           Use :func:`APIElement.filter` instead
        """
        listObj=self.getMany(endpoint, params)
        if listObj != None and len(listObj) > 0:
            return listObj[0]
        else:
            return None

    def newSingleElement(self, endpoint, obj):
        """ Adds a new element to an arbitrary endpoint

        .. deprecated:: 0.0.2
           Use :func:`APIElement.new` instead

        """
        response=requests.post(self.url + "/" + endpoint+"/"+self.project,
                               json=obj,
                               headers=self.headers)
        if response.status_code >= 300 or response.status_code < 200:
            try:
                msg=response.json()
                print("Error: {}\nDetails: {}".format(msg['message'],
                                                      msg['details']))
            except:
                print("Error: {}".format(response.text))

        return (response.status_code, response.json())

class Algorithm(APIElement):
    """ Endpoint for launching Algorithm pipelines on media elements
        `rest/Algorithms` endpoint.
    """
    def __init__(self, api):
        super().__init__(api, "Algorithms", "Algorithm")
    def launch_on_media(self, algorithm_name, media_id):
        """ Launch a given algorithm on an individual media

        :param str algorithm_name: Name of the algorithm
        :param int media_id: id of the media to launch algorithm on
        """
        return self._launch({"algorithm_name": algorithm_name,
                            "media_query": f"?media_id={media_id}"})
    def launch_on_medias(self, algorithm_name, media_ids):
        """ Launch a given algorithm on an individual media

        :param str algorithm_name: Name of the algorithm
        :param list media_ids: list of ids of the media to launch algorithm on
        """
        return self._launch({"algorithm_name": algorithm_name,
                            "media_ids": media_ids})
    def _launch(self, params):
        launch_endpoint="AlgorithmLaunch"
        response=requests.post(self.url + "/" + launch_endpoint  +"/"+self.project,
                               json=params,
                               headers=self.headers)
        if response.status_code >= 300 or response.status_code < 200:
            try:
                msg=response.json()
                print("Error: {}\nDetails: {}".format(msg['message'],
                                                      msg['details']))
            except:
                print("Error: {}".format(response.text))

        return (response.status_code, response.json())
    def get(self, pk):
        """ .. warning:: Not supported for algorithm endpoint """
        pass
    def new(self, obj):
        """ .. warning:: Not supported for algorithm endpoint """
        pass
    def update(self, pk, patch):
        """ .. warning:: Not supported for algorithms endpoint """
        pass
    def filter(self, params):
        """ .. warning:: Not supported for algorithms endpoint """
        pass
    def all(self):
        """ .. warning:: Not supported for algorithms endpoint """
        pass
    def getMany(self, endpoint, params):
        """ .. warning:: Not supported for algorithms endpoint """
        pass

class AttributeType(APIElement):
    """ Describes elements from `rest/AttributeTypes` """
    def __init__(self, api):
        super().__init__(api, "AttributeTypes", "AttributeType")

class MediaType(APIElement):
    """ Describes elements from `rest/MediaTypes` """
    def __init__(self, api):
        super().__init__(api, "MediaTypes", "MediaType")

class Membership(APIElement):
    """ Describes elements from `rest/Memberships` """
    def __init__(self, api):
        super().__init__(api, "Memberships", "Membership")

class Project(APIElement):
    """ Describes elements from `rest/Projects` """
    def __init__(self, api):
        super().__init__(api, "Projects", "Project")

class User(APIElement):
    """ Describes elements from `rest/Users` """
    def __init__(self, api):
        super().__init__(api, "Users", "User")

class Version(APIElement):
    """ Describes elements from `rest/Versions` """
    def __init__(self, api):
        super().__init__(api, "Versions", "Version")

class Media(APIElement):
    """ Defines interactions to Media elements at `/rest/Medias` """
    def __init__(self, api):
        super().__init__(api, "Medias", "Media")
        split=urlsplit(self.url)
        self.tusURL=urljoin("https://"+split.netloc, "files/")
        self.mediaTypeApi = MediaType(api)

    def downloadFile(self, element, out_path):
        """ Download a media file from Tator to an off-line location

        :param dict element: Dictionary from :func:`Media.filter`
        :param path-like out_path: Path to where to download
        """
        #Use streaming mp4 unless original is present
        url=element['url']
        if 'original_url' in element:
            if element['original_url']:
                url=element['original_url']

        # Supply token here for eventual media authorization
        with requests.get(url, stream=True, headers=self.headers) as r:
            r.raise_for_status()
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

    def uploadFile(self, typeId, filePath, waitForTranscode=True, progressBars=True, md5=None,section=None, fname=None):
        """ Upload a new file to Tator """
        if md5==None:
            md5 = md5_sum(filePath)
        upload_uid = str(uuid1())
        upload_gid = str(uuid1())
        if fname is None:
            fname=os.path.basename(filePath)
        if section is None:
            section="New Files"

        found=self.byMd5(md5)
        if found:
            print(f"File with {md5} found in db ({found['name']})")
            return False

        tus = TusClient(self.tusURL)
        chunk_size=100*1024*1024 # 100 Mb
        uploader = tus.uploader(filePath, chunk_size=chunk_size)
        num_chunks=math.ceil(uploader.file_size/chunk_size)
        if progressBars:
            bar=progressbar.ProgressBar(prefix="Upload",redirect_stdout=True)
        else:
            bar=progressbar.NullBar()

        for _ in bar(range(num_chunks)):
            uploader.upload_chunk()

        mediaType = self.mediaTypeApi.get(typeId)

        if mediaType['type']['dtype'] == 'video':
            endpoint = 'Transcode'
        else:
            endpoint = 'SaveImage'

        # Initiate transcode.
        out = requests.post(f'{self.url}/{endpoint}/{self.project}',
                            headers=self.headers,
                            json={
                                'type': typeId,
                                'uid': upload_uid,
                                'gid': upload_gid,
                                'url': uploader.url,
                                'name': fname,
                                'section': section,
                                'md5': md5,
        })
        try:
            print("{}, {}".format(fname, out.json()['message']))
            out.raise_for_status()
        except Exception as e:
            print("Error: '{}'".format(out.text))
            return False

        if (waitForTranscode == True) and (endpoint == 'Transcode'):
            # Poll for the media being created every 5 seconds
            if progressBars:
                bar=progressbar.ProgressBar(prefix="Transcode",redirect_stdout=True)
            else:
                bar=progressbar.NullBar()

            #check quickly for the 1st half second then go slow
            for i in bar(count()):
                if i % 2 == 0:
                    media=self.byMd5(md5)
                    if media:
                        bar.finish()
                        break
                else:
                    if i < 20:
                        time.sleep(0.1)
                    else:
                        print("Waiting for transcode...")
                        time.sleep(2.5)

        return media['id']

    def byMd5(self, md5):
        """ Returns a media element with a matching md5

        .. deprecated:: 0.0.2
           Use :func:`APIElement.filter` instead
        """
        return self.getSingleElement("Medias", {"md5": md5})

    def byName(self, name):
        """ Returns a media element with a matching name

        .. deprecated:: 0.0.2
           Use :func:`APIElement.filter` instead
        """
        return self.getSingleElement("Medias", {"name": name})

    def byId(self, pk):
        """ Returns a media element with a given id

        .. deprecated:: 0.0.2
           Use :func:`APIElement.get` instead
        """
        return self.get(pk)

    def applyAttribute(self, media_id, attributes):
        """ Returns a media element with a matching md5

        .. deprecated:: 0.0.2
           Use :func:`APIElement.patch` instead
        """

        patchUrl=f"Media/{media_id}"
        response = requests.patch(self.url+"/"+patchUrl,
                                  json={"attributes":attributes},
                                  headers=self.headers)
        if response.status_code != 200:
            try:
                msg=response.json()
                print("Error: {}\nDetails: {}".format(msg['message'],
                                                      msg['details']))
            except:
                print(f"Error: {response.status_code}\n{response.content}")

            return False
        else:
            return True

class LocalizationType(APIElement):
    """ Class to support operations to `rest/LocalizationTypes` """
    def __init__(self, api):
         super().__init__(api, "LocalizationTypes", "LocalizationType")

    def byTypeId(self, typeId):
        return self.getSingleElement("LocalizationTypes", {"type": typeId})

class StateType(APIElement):
    """ Class to support operations to `rest/StateTypes` """
    def __init__(self, api):
         super().__init__(api, "StateTypes", "StateType")

    def byTypeId(self, typeId):
        """ Returns a state type element with a matching type id

        .. deprecated:: 0.0.2
           Use :func:`APIElement.get` instead
        """
        return self.getSingleElement("StateTypes", {"type": typeId})

class State(APIElement):
    """ Class to support operations to `rest/States` """
    def __init__(self, api):
        super().__init__(api,"States", "State")
    def byAttr(self, key, value):
        """ Returns a state element with a matching name

        .. deprecated:: 0.0.2
           Use :func:`APIElement.filter` instead
        """
        lookup=f"{key}::{value}"
        return self.getSingleElement("States", {"attribute": lookup})
    def add(self, typeId, medias, attrs, localizations=[], version=None):
        """ Adds a new state element

        .. deprecated:: 0.0.2
           Use :func:`APIElement.new` instead
        """
        obj={}
        if type(medias) is list:
            obj["media_ids"] = medias
        elif type(medias) is int:
            obj["media_ids"] = [medias]

        obj["type"]=typeId
        obj["localization_ids"]=localizations
        if version:
            obj["version"] = version
        obj.update(attrs)
        (code, json) = self.newSingleElement("States", obj)
        # TODO: Should we return something more than 200 back from serfver?
        return code == 200

    def dataframe(self, params):
        """ State objects are nested, this function will flatten them prior to
            conversion to a dataframe. Otherwise the same as the parent function
         """
        allObjects=self.filter(params)
        if allObjects:
            columns = set(allObjects[0].keys())
            columns = columns.union(set(allObjects[0]['association'].keys()))
            columns = list(columns)
            for obj in allObjects:
                del obj['association']['id']
                obj.update(obj['association'])
            df = pd.DataFrame(data=allObjects,
                              columns=columns)
            return df
        else:
            return None

class Track(State):
    """ Object that deals with State objects that relate to Localizations.

    These types of objects are referred to as tracks. One example is *tracking*
    an object across multiple frames of a video.
    """
    def __init__(self, api):
        super().__init__(api)

    def addLocalizations(self, trackObj, localizations):
        """ Given a track state object, associate it with a list of
            localizations
            :param dict trackObj: Track object returned from API
            :param iterable localizations: List or set of localization ids.
        """
        associationId=trackObj["association"]["id"]
        newLocalSet=set(trackObj["association"]["localizations"])
        if type(localizations) is list:
            for local in localizations:
                newLocalSet.add(local)
        else:
            newLocalSet.add(localizations)

        print(f"Adding {localizations}, result = {list(newLocalSet)}")
        obj={"localizations" : list(newLocalSet)}
        patchUrl=f"LocalizationAssociation/{self.project}/{associationId}"
        response=requests.patch(self.url+"/"+patchUrl,
                                json=obj,
                                headers=self.headers)
        if response.status_code != 200:
            try:
                msg=response.json()
                print("Error: {}\nDetails: {}".format(msg['message'],
                                                      msg['details']))
            except:
                print(f"Error: {response.status_code}\n{response.content}")

            return None
        else:
            trackObj["association"]["localizations"] = list(newLocalSet)
            return trackObj

class Localization(APIElement):
    """ Object to deal with Localizations in database `rest/Localizations`

    Localizations are boxes, lines, or dots made by annotators on images or
    videos.
    """
    def __init__(self, api):
         super().__init__(api, "Localizations", "Localization")

    def add(self, mediaId, typeId, attrs):
        """ Add a new localization to a media element.

        .. deprecated:: 0.0.2
           Use :func:`APIElement.new` instead
        """
        obj={"media_id" : mediaId,
             "type" : typeId}
        obj.update(attrs)
        (code, json) = self.newSingleElement("Localizations", obj)
        if code == 200:
            return json
        else:
            return None

    def addMany(self, listObj):
        """ Add many localizations to a media element.

        This is a shortcut function that allows to the bulk ingestion of
        many annotations on a media element, without there having to be a
        request for each box, line or dot. Each element of the list needs
        to match the syntax for :func:`APIElement.new` for a localization
        """
        response=requests.post(self.url+"/Localizations"+"/"+self.project,
                               json={"many":listObj},
                               headers=self.headers)

        if response.status_code < 200 or response.status_code >= 300:
            try:
                msg=response.json()
                print("Error {}: {}\nDetails: {}".format(response.status_code,
                                                         msg['message'],
                                                         msg['details']))
            except:
                # message wasn't json
                msg = response.text
                print(f"Error {response.status_code}: {msg}")
                return (response.status_code, None)

        return (response.status_code, response.json())

    def query(self, params):
        """ Queries for a list of localizations.

        .. deprecated:: 0.0.2
           Use :func:`APIElement.filter` instead.
        """
        response=requests.get(self.url+"/Localizations/"+self.project,
                               params=params,
                               headers=self.headers)
        if response.status_code != 200:
            msg=response.json()
            print("Error: {}\nDetails: {}".format(msg['message'],
                                                  msg['details']))
        return (response.status_code, response.json())

class TreeLeaf(APIElement):
    """ Interfaces to tree leaf elements. `rest/TreeLeaves`

        Treeleaves are used to support aribitrary leveled data types and
        can be used to drive autocomplete/typeahead suggestions. An example
        use of a TreeLeaf tree is a taxonomic structure.
    """
    def __init__(self, api):
        super().__init__(api, "TreeLeaves", "TreeLeaf")

    def isPresent(self, name):
        """ Acquire a tree leaf element by its name

        .. deprecated:: 0.0.2
           Use :func:`APIElement.filter` instead
        """
        response=self.getSingleElement("TreeLeaves", {"name": name})
        #"project": self.project})
        return response != None

    def tree(self, ancestor):
        """ Acquire a tree listing by an ancestor

        .. deprecated:: 0.0.2
           Use :func:`APIElement.filter` instead
        """
        return self.getMany("TreeLeaves", {"ancestor": ancestor})

    def addIfNotPresent(self, name, parent, typeid, attr=None):
        """ Add a tree leaf if not already present

        :param str name: The name of the element
        :param str parent: The name of the parent
        :param int typeid: The type id of the tree leaf
        :param dict attr: Attributes to apply to the element upon creation
        """
        if self.isPresent(name):
            print(f"{name} found in DB, skipping")
            return True

        parentId=None
        # Resolve parent to id
        if type(parent) is str:
            parentObj=self.getSingleElement("TreeLeaves", {"name": parent})
                                                           #"project": self.project})
            if parentObj == None:
                raise Exception(f'Unknown parent! ({parent})')
            else:
                parentId=parentObj['id']

        obj={"type": typeid,
             "name": name,
             "parent": parentId,
             #"project": self.project, # TODO BROKEN due to REST API
             #TODO: This following line is wrong, just to work around broken Rest API
             "path": None}
        if attr:
            # Flatten out attributes to be part of the object
            obj = {**obj,**attr}

        (code, json) = self.newSingleElement("TreeLeaves", obj)
        if code == 200:
            obj=self.getSingleElement("TreeLeaves", {"name": name}) #TODO: Fix after rest
                                                     #"project": self.project})

            # Temp fix for broken rest api
            print(f"Patching attributes = {attr}")
            attributes={"attributes": attr}
            response=requests.patch(self.url+"/TreeLeaf/{}/{}".format(self.project,obj['id']),
                                json=attributes,
                                headers=self.headers)
            return response.status_code==200
        else:
            print(f"Return = {code}, {json}")
            return False

class TreeLeafType(APIElement):
    """ Interface to tree leaf type elements. `rest/TreeLeafTypes` """
    def __init__(self, api):
        super().__init__(api, "TreeLeafTypes", "TreeLeafType")

