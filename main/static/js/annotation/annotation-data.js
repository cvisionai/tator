class AnnotationData extends HTMLElement {
  constructor() {
    super();

    this._trackDb = new Map();
    this._updateUrls = new Map();
    this._dataByType = new Map();
  }

  set dataTypes(val) {
    const trackTypeIds=[];
    const localTypeIds=[];
    for (const [idx, dataType] of val.entries()) {
      let isLocalization=false;
      let isTrack=false;
      let isTLState=false;
      if ("resourcetype" in dataType.type) {
        isLocalization = dataType.type.
            resourcetype.includes("EntityTypeLocalization");
      }
      if ("association" in dataType.type) {
        isTrack = (dataType.type.association == "Localization");
      }
      if ("interpolation" in dataType.type) {
        isTLState = (dataType.type.interpolation == "latest");
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
        this._updateUrls.set(val[typeIdx].type.id, val[typeIdx].data);
        this.updateType(val[typeIdx], semaphore);
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
          this._updateUrls.set(val[typeIdx].type.id, val[typeIdx].data);
          this.updateType(val[typeIdx], semaphore);
        });
      });
    });

    initDone.then(() => {
      this.dispatchEvent(new Event("initialized"));
    });

    // Convert datatypes array to a map for faster access
    this._dataTypes={}
    for (const dataType of val) {
      this._dataTypes[dataType.type.id] = dataType;
    }
  }

  updateType(typeObj, callback) {
    const typeId = typeObj.type.id;
    if (this._updateUrls.has(typeId) == false) {
      console.error("Unregistered type " + typeId);
      return;
    }

    // Fetch new ones from server
    fetchRetry(this._updateUrls.get(typeId))
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
