class AnnotationData extends HTMLElement {
  constructor() {
    super();

    this._trackDb = new Map();
    this._updateUrls = new Map();
    this._dataByType = new Map();
    this._edited = true;
  }

  init(dataTypes, version) {
    this._dataTypesRaw = dataTypes;
    this._version = version;

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

  setVersion(version, edited) {
    this._version = version;
    this._edited = edited;
    this.updateAll(this._dataTypesRaw, version);
  }

  updateAll(dataTypes, version) {
    const trackTypeIds=[];
    const localTypeIds=[];
    for (const [idx, dataType] of dataTypes.entries()) {
      let isLocalization=false;
      let isTrack=false;
      let isTLState=false;
      if ("dtype" in dataType) {
        isLocalization = dataType.dtype in ["box", "line", "dot"];
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
        this._updateUrls.set(dataTypes[typeIdx].id, dataTypes[typeIdx].data);
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
          this._updateUrls.set(dataTypes[typeIdx].id, dataTypes[typeIdx].data);
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
        obj.association = {
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

    let url = this._updateUrls.get(typeId);
    if (query) {
      url += "&search=";
      url += query;
    }
    url += "&version=";
    url += this._version.id;
    url += "&modified=";
    url += Number(this._edited);

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
