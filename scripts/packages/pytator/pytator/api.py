import json
import math
import requests
import time
import os
import progressbar

from pytator.md5sum import md5_sum
from itertools import count
from tusclient.client import TusClient
from urllib.parse import urljoin
from urllib.parse import urlsplit
from uuid import uuid1

""" API Implementation details """

class APIElement:
    def __init__(self, api):
        self.url = api[0].rstrip('/')
        self.token = str(api[1])
        self.project = str(api[2])
        self.headers={"Authorization" : "Token {}".format(self.token),
                      "Content-Type": "application/json"}

    def getMany(self, endpoint, params):
        obj = None
        try:
            response=requests.get(self.url + "/" + endpoint+"/"+self.project,
                                  params=params,
                                  headers=self.headers)
            if response.status_code == 200:
                jsonList=response.json()
                if (len(jsonList) >= 1):
                    obj = jsonList
        except Exception as e:
            print(e)
        finally:
            return obj
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

class Media(APIElement):
    def __init__(self, api):
        super().__init__(api)
        split=urlsplit(self.url)
        self.tusURL=urljoin("https://"+split.netloc, "files/")

    def downloadFile(self, element, out_path):
        #Use streaming mp4 unless original is present
        url=element['url']
        if element['original_url']:
            url=element.original_url

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

    def byId(self, id):
        return self.getSingleElement("EntityMedias", {"media_id": id})

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
         super().__init__(api)

    def byTypeId(self, typeId):
        return self.getSingleElement("LocalizationTypes", {"type": typeId})

class StateType(APIElement):
    def __init__(self, api):
         super().__init__(api)

    def byTypeId(self, typeId):
        return self.getSingleElement("EntityStateTypes", {"type": typeId})

class State(APIElement):
    def __init__(self, api):
        super().__init__(api)
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
         super().__init__(api)

    def add(self, mediaId, typeId, attrs):
        obj={"media_id" : mediaId,
             "type" : typeId}
        obj.update(attrs)
        (code, json) = self.newSingleElement("Localizations", obj)
        if code == 200:
            return json
        else:
            return None

    def getMany(self, mediaId, typeId):
        return super().getMany("Localizations", {'media_id': mediaId,
                                                 'type': typeId})

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
        super().__init__(api)

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
