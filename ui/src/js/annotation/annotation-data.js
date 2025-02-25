import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class AnnotationData extends HTMLElement {
  constructor() {
    super();

    this._dataTypesRaw = [];
    this._dataTypes = {};
    this._trackDb = new Map();
    this._updateUrls = new Map();
    this._dataByType = new Map();
    this._stateMediaIds = new Array();
    this._localizationMediaIds = new Array();
  }

  init(
    dataTypes,
    version,
    projectId,
    mediaId,
    update,
    allowNonTrackStateData,
    versions,
    memberships
  ) {
    this._versions = versions;
    this._memberships = memberships;
    // Update defaults to true
    if (update == undefined) {
      update = true;
    }

    for (const dataType of dataTypes) {
      if (dataType.dtype == "state") {
        if (allowNonTrackStateData == undefined || dataType.isTrack == true) {
          this._stateMediaIds.push(mediaId);
        } else if (allowNonTrackStateData) {
          this._stateMediaIds.push(mediaId);
        }
      } else {
        this._localizationMediaIds.push(mediaId);
      }
    }

    this._version = version;
    this._projectId = projectId;
    this._mediaId = mediaId;

    if (update) {
      for (const dataType of dataTypes) {
        this._dataTypesRaw.push(dataType);
      }
      this.updateAll(dataTypes, version).then(() => {
        this.dispatchEvent(new Event("initialized"));
      });
    }

    // Convert datatypes array to a map for faster access
    this._dataByType = new Map();
    for (const dataType of dataTypes) {
      let dataTypeRegistered = dataType.id in this._dataTypes;
      if (!dataTypeRegistered) {
        this._dataTypes[dataType.id] = dataType;
        this._dataTypesRaw.push(dataType);
      }
    }
  }

  initialUpdate() {
    this.updateAll(this._dataTypesRaw, this._version).then(() => {
      this.dispatchEvent(new Event("initialized"));
    });
  }

  // Returns a promise when done
  setVersion(version, viewables) {
    this._version = version;
    this._viewables = viewables;
    return this.updateAll(this._dataTypesRaw, version, viewables);
  }

  getVersion() {
    return this._version;
  }

  // Returns a promise when done
  updateAll(dataTypes, version, viewables) {
    // This fetches ALL types for localizations and states in 2 requests
    const stateTypeIds = {};
    const localTypeIds = {};

    // Clear the track database
    this._trackDb = new Map();

    // Construct the individual update URLs
    const getDataUrl = (dataType) => {
      const dataEndpoint =
        dataType.dtype == "state" ? "States" : "Localizations";
      let mediaIds =
        dataType.dtype == "state"
          ? this._stateMediaIds
          : this._localizationMediaIds;
      const uniqueIds = new Set(mediaIds);
      mediaIds = Array.from(uniqueIds);
      let dataUrl =
        "/rest/" +
        dataEndpoint +
        "/" +
        this._projectId +
        "?media_id=" +
        mediaIds.join(",") +
        "&type=" +
        dataType.id.split("_")[1];
      // The UI desires the merge result not the raw result from the server
      if (dataEndpoint == "Localizations" || dataEndpoint == "States") {
        dataUrl += "&merge=1";
      }
      return dataUrl;
    };

    for (const [idx, dataType] of dataTypes.entries()) {
      const numericId = Number(dataType.id.split("_")[1]);
      if (dataType.dtype == "state") {
        stateTypeIds[numericId] = dataType.id;
      } else {
        localTypeIds[numericId] = dataType.id;
      }
    }

    let states_url = new URL(
      `/rest/States/${this._projectId}?media_id=${this._stateMediaIds.join(
        ","
      )}&merge=1`,
      window.BACKEND ? window.BACKEND : window.location.origin
    );
    let localizations_url = new URL(
      `/rest/Localizations/${
        this._projectId
      }?media_id=${this._localizationMediaIds.join(",")}&merge=1`,
      window.BACKEND ? window.BACKEND : window.location.origin
    );

    let state_search = new URLSearchParams(states_url.search.slice(1));
    let local_search = new URLSearchParams(localizations_url.search.slice(1));

    let requested_versions = [...this._version.bases, this._version.id];
    if (this._viewables) {
      requested_versions = [
        ...new Set(requested_versions.concat(this._viewables)),
      ];
    }
    state_search.set("version", requested_versions);
    states_url.search = state_search;

    local_search.set("version", requested_versions);
    localizations_url.search = local_search;

    console.info("Fetching states from " + states_url);
    console.info("Fetching localizations from " + localizations_url);

    let initDone = new Promise(async (resolve, reject) => {
      let stateResponse = await fetchCredentials(states_url, {}, true);
      let localResponse = await fetchCredentials(localizations_url, {}, true);
      let stateData = await stateResponse.json();
      let localData = await localResponse.json();

      // initialize the dataByType for each dataType
      for (const dataType of dataTypes) {
        this._dataByType.set(dataType.id, []);
      }

      // Do states first which may be tracks
      // Because we fetch ALL types and filter locally we have to exclude ones
      // which don't matter for this media
      // TODO support a list of types for localization searches
      for (const state of stateData) {
        state.type = stateTypeIds[state.type];
        if (state.type) {
          this._dataByType.get(state.type).push(state);
        }
      }

      // Now do localizations
      for (const local of localData) {
        local.type = localTypeIds[local.type];
        if (local.type) {
          this._dataByType.get(local.type).push(local);
        }
      }

      // Send out notifications
      for (const [key, value] of this._dataByType) {
        this._dataByType.set(key, value);
        const typeObj = this._dataTypes[key];
        this._updateUrls.set(typeObj.id, getDataUrl(typeObj));
        this.dispatchEvent(
          new CustomEvent("freshData", {
            detail: {
              typeObj: typeObj,
              data: value,
            },
          })
        );
      }

      // Finally resolve
      resolve();
    });

    // Make a request URL for the states

    // Make a request URL for the localizations

    return initDone;
  }

  updateLocalizations(callback, search) {
    for (const key in this._dataTypes) {
      let dataType = this._dataTypes[key];
      let isLocalization = false;
      if ("dtype" in dataType) {
        isLocalization = ["box", "line", "dot", "poly"].includes(
          dataType.dtype
        );
      }

      if (isLocalization) {
        this.updateType(dataType, callback, search);
      }
    }
  }

  updateAllTypes(callback, search) {
    for (const key in this._dataTypes) {
      let dataType = this._dataTypes[key];
      this.updateType(dataType, callback, search);
    }
  }

  /**
   * #TODO Update this to allow states
   */
  updateTypeWithData(typeObj, data) {
    const typeId = typeObj.id;

    if (this._dataByType.has(typeId)) {
      this._dataByType.get(typeId).push(data);
    } else {
      this._dataByType.set(typeId, []);
      this._dataByType.get(typeId).push(data);
    }

    this.dispatchEvent(
      new CustomEvent("freshData", {
        detail: {
          typeObj: typeObj,
          data: this._dataByType.get(typeId),
        },
      })
    );
  }

  updateTypeLocal(method, id, body, typeObj) {
    const typeId = typeObj.id;
    if (this._updateUrls.has(typeId) == false) {
      console.error("Unregistered type " + typeId);
      return;
    }

    const attributeNames = typeObj.attribute_types.map((column) => column.name);
    const setupObject = (obj) => {
      obj.id = id;
      obj.type = typeId;
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
      // Only push the object if it's a localization. The state object has some other
      // content that is generated by the endpoint and not by the annotation frontend.
      if (this._dataTypes[typeId].id.includes("state")) {
        // Force retrieving the data from the REST API
        this.updateType(typeObj, null, null);
        return;
      } else {
        this._dataByType.get(typeId).push(setupObject(body));
      }
    } else if (method == "PATCH") {
      const ids = this._dataByType.get(typeId).map((elem) => elem.id);
      const index = ids.indexOf(id);
      const elem = this._dataByType.get(typeId)[index];
      for (const key in body) {
        if (elem && key in elem) {
          elem[key] = body[key];
        }
      }
      this._dataByType.get(typeId)[index] = elem;
    } else if (method == "DELETE") {
      const ids = this._dataByType.get(typeId).map((elem) => elem.id);
      const index = ids.indexOf(id);
      // It is possible for the ID to not exist if it is part of a different version/layer.
      if (index == -1) {
        return;
      }
      this._dataByType.get(typeId).splice(index, 1);
    }
    this.dispatchEvent(
      new CustomEvent("freshData", {
        detail: {
          typeObj: typeObj,
          data: this._dataByType.get(typeId),
        },
      })
    );
  }

  updateType(typeObj, callback, query) {
    const typeId = typeObj.id;
    if (this._updateUrls.has(typeId) == false) {
      console.error("Unregistered type " + typeId);
      return;
    }

    let url = new URL(
      this._updateUrls.get(typeId),
      window.BACKEND ? window.BACKEND : window.location.origin
    );
    let searchParams = new URLSearchParams(url.search.slice(1));
    if (query) {
      searchParams.set("encoded_search", query);
    }

    let requested_versions = [...this._version.bases, this._version.id];
    if (this._viewables) {
      requested_versions = [
        ...new Set(requested_versions.concat(this._viewables)),
      ];
    }
    searchParams.set("version", requested_versions);
    url.search = searchParams;

    // Fetch new ones from server
    fetchCredentials(url, {}, true)
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          console.error("Error fetching updated data for type ID " + typeId);
          response.json().then((json) => console.log(JSON.stringify(json)));
        }
      })
      .then((json) => {
        json.forEach((obj) => {
          obj.type = typeId;
        });
        this._dataByType.set(typeId, json);
        this.dispatchEvent(
          new CustomEvent("freshData", {
            detail: {
              typeObj: typeObj,
              data: json,
            },
          })
        );
        if (callback) {
          callback();
        }
      });
  }

  updateMedia() {
    fetchCredentials(`/rest/Media/${this._mediaId}?presigned=28800`, {}, true)
      .then((response) => response.json())
      .then((data) => {
        this.dispatchEvent(
          new CustomEvent("mediaUpdate", {
            detail: {
              media: data,
            },
          })
        );
      });
  }

  get project() {
    return this._projectId;
  }
}

if (!customElements.get("annotation-data")) {
  customElements.define("annotation-data", AnnotationData);
}
