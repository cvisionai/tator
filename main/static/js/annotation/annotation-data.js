class AnnotationData extends HTMLElement {
  constructor() {
    super();

    this._trackDb = new Map();
    this._updateUrls = new Map();
    this._dataByType = new Map();
    this._edited = true;
  }

  init(dataTypes, version, projectId, mediaId) {
    this._dataTypesRaw = dataTypes;
    this._version = version;
    this._projectId = projectId;
    this._mediaId = mediaId;

    this.updateAll(dataTypes, version)
    .then(() => {
      this.dispatchEvent(new Event("initialized"));
    });

    // Convert datatypes array to a map for faster access
    this._dataTypes={}
    for (const dataType of dataTypes) {
      this._dataTypes[dataType.id] = dataType;
    }
  }

  // Returns a promise when done
  setVersion(version, edited) {
    this._version = version;
    this._edited = edited;
    return this.updateAll(this._dataTypesRaw, version);
  }

  getVersion()
  {
    return this._version;
  }

  // Returns a promise when done
  updateAll(dataTypes, version) {
    const trackTypeIds=[];
    const localTypeIds=[];

    // Clear the track database
    this._trackDb = new Map();
    for (const [idx, dataType] of dataTypes.entries()) {
      let isLocalization=false;
      let isTrack=false;
      let isTLState=false;
      if ("dtype" in dataType) {
        isLocalization = ["box", "line", "dot"].includes(dataType.dtype);
      }
      if ("association" in dataType) {
        isTrack = (dataType.association == "Localization");
      }
      if ("interpolation" in dataType) {
        isTLState = (dataType.interpolation == "latest");
      }
      dataType.isLocalization = isLocalization;
      dataType.isTrack = isTrack;
      dataType.isTLState = isTLState;
      if (isTrack) {
        trackTypeIds.push(idx);
      } else {
        localTypeIds.push(idx);
      }
    }

    // Define function for getting data url.
    const getDataUrl = dataType => {
      const dataEndpoint = dataType.dtype == "state" ? "States" : "Localizations";
      let dataUrl = "/rest/" + dataEndpoint + "/" + this._projectId + "?media_id=" +
            this._mediaId + "&type=" + dataType.id.split("_")[1];
      if (dataEndpoint == "Localizations")
      {
        // TODO probably want this for States as well once it is supported there
        dataUrl += "&excludeParents=1";
      }
      return dataUrl;
    };

    // Update tracks first
    const tracksDone = new Promise(resolve => {
      if (trackTypeIds.length == 0) {
        resolve();
      }

      // Only trigger the promise after all tracks are processed
      let count = trackTypeIds.length;
      const semaphore = function() {
        count = count - 1;
        if (count == 0) {
          resolve();
        }
      };

      trackTypeIds.forEach(typeIdx => {
        this._updateUrls.set(dataTypes[typeIdx].id, getDataUrl(dataTypes[typeIdx]));
        this.updateType(dataTypes[typeIdx], semaphore);
      });
    });

    const initDone = new Promise(resolve => {
      let count = localTypeIds.length;
      if (count == 0) {
        resolve();
      }
      const semaphore = function() {
        count = count - 1;
        if (count == 0) {
          resolve();
        }
      };

      //Update localizations after
      tracksDone.then(() => {
        localTypeIds.forEach(typeIdx => {
          this._updateUrls.set(dataTypes[typeIdx].id, getDataUrl(dataTypes[typeIdx]));
          this.updateType(dataTypes[typeIdx], semaphore);
        });
      });
    });

    return initDone;
  }

  updateTypeLocal(method, id, body, typeObj) {
    const typeId = typeObj.id;
    if (this._updateUrls.has(typeId) == false) {
      console.error("Unregistered type " + typeId);
      return;
    }

    // Posting with modified field set to false is ignored.
    if (method == "POST" && "modified" in body) {
      if (body.modified == false) {
        return;
      }
    }

    // Patching the modified field may be treated as post/delete as it could
    // change versions.
    if (method == "PATCH" && "modified" in body) {
      if (body.modified == null) {
        method = "POST";
      } else if (body.modified == false) {
        method = "DELETE";
      }
    }

    const attributeNames = typeObj.attribute_types.map(column => column.name);
    const setupObject = obj => {
      obj.id = id;
      obj.meta = typeId;
      obj.attributes = {};
      for (const key in body) {
        if (attributeNames.includes(key)) {
          obj.attributes[key] = body[key];
        }
      }
      if (typeObj.isTLState) {
        obj = {
          ...obj,
          frame: body.frame,
          media: [Number(body.media_ids)],
        };
      }
      return body;
    };
    if (method == "POST") {
      this._dataByType.get(typeId).push(setupObject(body));
    } else if (method == "PATCH") {
      const ids = this._dataByType.get(typeId).map(elem => elem.id);
      const index = ids.indexOf(id);
      const elem = this._dataByType.get(typeId)[index];
      for (const key in body) {
        if (key in elem) {
          elem[key] = body[key];
        }
      }
      this._dataByType.get(typeId)[index] = elem;
    } else if (method == "DELETE") {
      const ids = this._dataByType.get(typeId).map(elem => elem.id);
      const index = ids.indexOf(id);
      // It is possible for the ID to not exist if it is part of a different version/layer.
      if (index == -1) {
        return;
      }
      this._dataByType.get(typeId).splice(index, 1);
    }
    this.dispatchEvent(new CustomEvent("freshData", {
      detail: {
        typeObj: typeObj,
        data: this._dataByType.get(typeId),
      }
    }));
  }

  updateType(typeObj, callback, query) {
    const typeId = typeObj.id;
    if (this._updateUrls.has(typeId) == false) {
      console.error("Unregistered type " + typeId);
      return;
    }

    let url = new URL(this._updateUrls.get(typeId), location.protocol + '//' + location.host);
    let searchParams = new URLSearchParams(url.search.slice(1));
    if (query) {
        searchParams.set('search',query);
    }

    searchParams.set('version',[...this._version.bases,this._version.id]);
    searchParams.set('modified', Number(this._edited));
    url.search = searchParams;

    // Fetch new ones from server
    fetchRetry(url)
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        console.error("Error fetching updated data for type ID " + typeId);
        response.json()
        .then(json => console.log(JSON.stringify(json)));
      }
    })
    .then(json => {
      json.forEach(obj => {obj.meta = typeId});
      this._dataByType.set(typeId, json);
      this.dispatchEvent(new CustomEvent("freshData", {
        detail: {
          typeObj: typeObj,
          data: json,
        }
      }));
      if (callback) {
        callback();
      }
    });
  }
}

customElements.define("annotation-data", AnnotationData);
