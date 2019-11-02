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

""" API Implementation details """

class APIElement:
    def __init__(self, api, endpoint):
        self.endpoint = endpoint
        self.individual_endpoint = endpoint.rstrip('s')
        self.url = api[0].rstrip('/')
        self.token = str(api[1])
        if api[2]:
            self.project = str(api[2])
        else:
            self.project = None
        self.headers={"Authorization" : "Token {}".format(self.token),
                      "Content-Type": "application/json",
                      "Accept-Encoding": "gzip"}

    # Deprecate direct calling of this
    def getMany(self, endpoint, params):
        obj = None
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
        return self.getMany(self.endpoint, params)

    def dataframe(self, params):
        allObjects=self.filter(params)
        if allObjects:
            return pd.DataFrame(data=allObjects,
                                columns=allObjects[0].keys())
        else:
            return None

    def all(self):
        return self.getMany(self.endpoint, None)

    def update(self, pk, patch):
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

    def new(self, obj):
        response=requests.post(self.url + "/" + self.endpoint +"/"+self.project,
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
        listObj=self.getMany(endpoint, params)
        if listObj != None and len(listObj) > 0:
            return listObj[0]
        else:
            return None

    def newSingleElement(self, endpoint, obj):
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
    def __init__(self, api):
        super().__init__(api, "Algorithms")
    def launch_on_media(self, algorithm_name, media_id):
        """ Convenience function launch an algorithm on a particular media """
        return self.launch({"algorithm_name": algorithm_name,
                            "media_query": f"?media_id={media_id}"})
    def launch_on_medias(self, algorithm_name, media_ids):
        return self.launch({"algorithm_name": algorithm_name,
                            "media_ids": media_ids})
    def launch(self, params):
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
        """ Not supported for algorithms """
        pass
    def new(self, obj):
        """ Not supported for algorithms """
        pass
    def update(self, pk, patch):
        """ Not supported for algorithms """
        pass
class MediaType(APIElement):
    def __init__(self, api):
         super().__init__(api, "EntityTypeMedias")

class Project(APIElement):
    def __init__(self, api):
         super().__init__(api, "Projects")

class User(APIElement):
    def __init__(self, api):
         super().__init__(api, "Users")

class Media(APIElement):
    def __init__(self, api):
        super().__init__(api, "EntityMedias")
        split=urlsplit(self.url)
        self.tusURL=urljoin("https://"+split.netloc, "files/")

    def downloadFile(self, element, out_path):
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

    def uploadFile(self, typeId, filePath, waitForTranscode=True, progressBars=True, md5=None,section=None):
        if md5==None:
            md5 = md5_sum(filePath)
        upload_uid = str(uuid1())
        upload_gid = str(uuid1())
        fname=os.path.basename(filePath)
        if section is None:
            section="New Files"

        found=self.byMd5(md5)
        if found:
            print(f"File with {md5} found in db ({found['name']})")
            return False

        tus = TusClient(self.tusURL)
        chunk_size=1*1024*1024 # 1 Mb
        uploader = tus.uploader(filePath, chunk_size=chunk_size)
        num_chunks=math.ceil(uploader.file_size/chunk_size)
        if progressBars:
            bar=progressbar.ProgressBar(prefix="Upload",redirect_stdout=True)
        else:
            bar=progressbar.NullBar()

        for _ in bar(range(num_chunks)):
            uploader.upload_chunk()

        # Initiate transcode.
        out = requests.post(self.url + '/Transcode'+"/"+self.project,
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

        if waitForTranscode == True:
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

        return True

    def byMd5(self, md5):
        return self.getSingleElement("EntityMedias", {"md5": md5})

    def byName(self, name):
        return self.getSingleElement("EntityMedias", {"name": name})

    def byId(self, pk):
        return self.get(pk)

    def applyAttribute(self, media_id, attributes):
        patchUrl=f"EntityMedia/{media_id}"
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
    def __init__(self, api):
         super().__init__(api, "LocalizationTypes")

    def byTypeId(self, typeId):
        return self.getSingleElement("LocalizationTypes", {"type": typeId})

class StateType(APIElement):
    def __init__(self, api):
         super().__init__(api, "EntityStateTypes")

    def byTypeId(self, typeId):
        return self.getSingleElement("EntityStateTypes", {"type": typeId})

class State(APIElement):
    def __init__(self, api):
        super().__init__(api,"EntityStates")
    def byAttr(self, key, value):
        lookup=f"{key}::{value}"
        return self.getSingleElement("EntityStates", {"attribute": lookup})
    def add(self, typeId, medias, attrs, localizations=[]):
        #Make it a list for uniformity
        obj={}
        if type(medias) is list:
            obj["media_ids"] = medias
        elif type(medias) is int:
            obj["media_ids"] = [medias]

        obj["type"]=typeId
        obj["localization_ids"]=localizations
        obj.update(attrs)
        (code, json) = self.newSingleElement("EntityStates", obj)
        # TODO: Should we return something more than 200 back from serfver?
        return code == 200

    def dataframe(self, params):
        """ Flatten association sub-object to make queries possible """
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
    def __init__(self, api):
        super().__init__(api)

    def addLocalizations(self, trackObj, localizations):
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
    def __init__(self, api):
         super().__init__(api, "Localizations")

    def add(self, mediaId, typeId, attrs):
        obj={"media_id" : mediaId,
             "type" : typeId}
        obj.update(attrs)
        (code, json) = self.newSingleElement("Localizations", obj)
        if code == 200:
            return json
        else:
            return None

    def addMany(self, listObj):
        response=requests.post(self.url+"/Localizations"+"/"+self.project,
                               json={"many":listObj},
                               headers=self.headers)

        if response.status_code < 200 or response.status_code >= 300:
            msg=response.json()
            print("Error: {}\nDetails: {}".format(msg['message'],
                                                  msg['details']))
        return (response.status_code, response.json())

    def query(self, params):
        response=requests.get(self.url+"/Localizations/"+self.project,
                               params=params,
                               headers=self.headers)
        if response.status_code != 200:
            msg=response.json()
            print("Error: {}\nDetails: {}".format(msg['message'],
                                                  msg['details']))
        return (response.status_code, response.json())

class TreeLeaf(APIElement):
    def __init__(self, api):
        super().__init__(api, "TreeLeaves")

    def isPresent(self, name):
        response=self.getSingleElement("TreeLeaves", {"name": name})
        #"project": self.project})
        return response != None

    def tree(self, ancestor):
        return self.getMany("TreeLeaves", {"ancestor": ancestor})

    def addIfNotPresent(self, name, parent, typeid, attr=None):
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
