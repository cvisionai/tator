/**
 * Assumptions:
 * - All names given to types are unique
 **/
class TatorData {

  constructor(project) {
    this._project = project;

    this._mediaTypes = [];
    this._mediaTypeNames = [];

    this._localizationTypes = [];
    this._localizaitonTypeNames = [];
  }

  getProjectId() {
    return this._project;
  }

  getStoredLocalizationTypes() {
    return this._localizationTypes;
  }

  getStoredMediaTypes() {
    return this._mediaTypes;
  }

  async init() {
    await this.getAllLocalizationTypes();
    await this.getAllMediaTypes();
  }

  /**
   * Saves the list of localization types associated with this project
   */
  async getAllLocalizationTypes() {

    var donePromise = new Promise(resolve => {

      const localizationRestUrl = "/rest/LocalizationTypes/" + this._project;
      const localizationPromise = fetchRetry(localizationRestUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      Promise.all([localizationPromise])
        .then(([localizationResponse]) => {
          const localizationJson = localizationResponse.json();
          Promise.all([localizationJson])
        .then(([localizationTypes]) => {
          this._localizationTypes = [...localizationTypes];
          resolve();
        });
      });

    });

    await donePromise;

    this._localizationTypeNames = [];
    this._localizationTypes.forEach(typeElem => this._localizationTypeNames.push(typeElem.name));
  }

  /**
   * Saves the list of media types associated with this project
   */
  async getAllMediaTypes() {

    var donePromise = new Promise(resolve => {

      const mediaRestUrl = "/rest/MediaTypes/" + this._project;
      const mediaPromise = fetchRetry(mediaRestUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      Promise.all([mediaPromise])
        .then(([mediaResponse]) => {
          const mediaJson = mediaResponse.json();
          Promise.all([mediaJson])
        .then(([mediaTypes]) => {
          this._mediaTypes = [...mediaTypes];
          resolve();
        });
      });

    });

    await donePromise;

    this._mediaTypeNames = [];
    this._mediaTypes.forEach(typeElem => this._mediaTypeNames.push(typeElem.name));
  }

  /**
   * Returns data for getFrame with project ID
   */
  async getFrame( frameId ){
    const response = await fetch(`/rest/GetFrame/${frameId}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();

    return data;
  }

    /**
   * Returns data for getFrame with project ID
   */
  async getLocalizationGraphic( localizationID ){
    const response = await fetch(`/rest/LocalizationGraphic/${localizationID}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "image/*",
        "Content-Type": "image/*"
      }
    });

    const data = await response.blob();

    return data;
  }


  /**
   * Returns a data for user with user ID
   */
  async getUser( userId ){
    const response = await fetch(`/rest/User/${userId}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();

    return data;
  }


  /**
   * Returns a data for user with user ID
   */
  async getLocalizationCount({params = ""} = {}){
    const response = await fetch(`/rest/LocalizationCount/${this._project}${params}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();

    return data;
  }


  /**
   * Returns a data for user with user ID
   */
  async getLocalizations({ params = "", start = 0, stop = 20} = {}){
    const response = await fetch(`/rest/Localizations/${this._project}?start=${start}&stop=${stop}${params}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();

    return data;
  }

  /**
   * @param {FilterConditionData} filter - Filter to convert
   * @returns {string} Tator REST compliant parameter string
   */
   _convertFilterForTator(filter) {

    // #TODO This will just assume we are using the user-defined attributes. Allow built-in
    //       but that will require a specific conversion table

    // Adjust the modifier to be lucene compliant
    var modifier = filter.modifier;
    var modifierEnd = "";

    if (modifier == "==") {
      modifier = "";
    }
    else if (modifier == "Includes") {
      modifier = "*";
      modifierEnd = "*";
    }

    // Lucene search string requires spaces to have the backlash preceding it
    var field = filter.field.replace(" ","\ ");
    var value = filter.value.replace(" ","\ ");

    // Finally generate the final parameter string compliant with Tator's REST call
    var paramStr = `${field}:${modifier}${value}${modifierEnd}`;
    return paramStr;
  }

  /**
   * Gets data from the corresponding Tator REST endpoint
   * #TODO Currently, this will search through all of a given entity type
   *
   * @param {string} outputType -
   *  ids|objects|count
   *
   * @param {array of objects} filterData -
   *   Objects must have the following:
   *     .filters {array of FilterConditionData}
   *     .entityType {object} - media|localization
   *
   * @param {integer} dataStart -
   *   Used in conjunction with dataStop and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {integer} dataStop =
   *   Used in conjunction with dataStart and pagination of data.
   *   If null, pagination is ignored.
   *
   * @returns {array}
   *   Results based on outputType and given filterData
   */
  async _getData(outputType, filterData, dataStart, dataStop) {

    // #TODO In the future, this may turn into promises per meta/dtype
    var promises = [];

    var entityType;
    var mediaIds;
    var paramString = "";
    var paramSearch = "";
    for (const name in filterData) {
      entityType = filterData[name].entityType;
      mediaIds = filterData[name].mediaIds;
      for (let idx = 0; idx < filterData[name].filters.length; idx++) {
        paramSearch += encodeURIComponent(this._convertFilterForTator(filterData[name].filters[idx]));
        if (idx < filterData[name].filters.length - 1) {
          paramSearch += encodeURIComponent(" AND ");
        }
      }
    }

    if (paramSearch) {
      paramString = "&search=" + paramSearch;
    }

    if (mediaIds != undefined && mediaIds.length > 0) {
      paramString += "&media_id=";
      for (let idx = 0; idx < mediaIds.length; idx++) {
        paramString += mediaIds[idx];
        if (idx < mediaIds.length - 1) {
          paramString += ","
        }
      }
    }

    let url = "/rest";

    if (this._localizationTypes.indexOf(entityType) >= 0) {
      if (outputType == "count") {
        url += "/LocalizationCount/";
      }
      else {
        url += "/Localizations/";
      }
    }
    else if (this._mediaTypes.indexOf(entityType) >= 0) {
      if (outputType == "count") {
        url += "/MediaCount/";
      }
      else {
        url += "/Medias/";
      }
    }

    if (!isNaN(dataStart) && !isNaN(dataStop)) {
      // Note: & into paramString is taken care of by paramString itself
      url += `${this._project}?start=${dataStart}&stop=${dataStop}${paramString}`;
    }
    else {
      url += `${this._project}?${paramString}`;
    }
    console.log("Getting data with URL: " + url);

    promises.push(fetchRetry(url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
    }));

    let resultsJson = [];
    await Promise.all(promises).then((responses) => {
      for (let response of responses) {
        resultsJson.push(response.json());
      }
    });
    const outData = Promise.all(resultsJson).then((results) => {
      var flatResults = results.flat();
      if (outputType == "ids") {
        var finalResults = [];
        flatResults.forEach(data => {
          finalResults.push(data.id);
        });
      }
      else {
        finalResults = flatResults;
      }
      return finalResults;
    });

    return outData;
  }

  /**
   * Retrieves a list of localization data matching the filter criteria
   * #TODO Currently, this will search through all localization types.
   *
   * @param {string} outputType -
   *  ids|objects|count
   *
   * @param {array of FilterConditionData objects} filters -
   *    List of FilterConditionData to apply
   *    Only conditions associated with media and localizations will be applied.
   *
   * @param {integer} dataStart -
   *   Used in conjunction with dataStop and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {integer} dataStop =
   *   Used in conjunction with dataStart and pagination of data.
   *   If null, pagination is ignored.
   *
   * @returns {array of integers}
   *    List of localization IDs matching the filter criteria
   */
  async getFilteredLocalizations(outputType, filters, dataStart, dataStop) {

    // Loop through the filters, if there are any media specific ones
    var mediaFilters = [];
    var localizationFilters = [];
    var locGroups = {};
      this._localizationTypes.forEach(locType => {
        locGroups[locType.name] = {filters: [], entityType: locType};
      });

    if (filters != undefined) {
      filters.forEach(filter => {
        if (this._mediaTypeNames.indexOf(filter.category) >= 0) {
          mediaFilters.push(filter);
        }
        else {
          localizationFilters.push(filter);
        }
      });

      // First, grab the media IDs we care about if there are media filters. Otherwise, ignore.
      var mediaIds = [];
      if (mediaFilters.length > 0) {
        mediaIds = await this.getFilteredMedia("ids", mediaFilters);
        console.log("matching mediaIds: " + mediaIds);
      }

      localizationFilters.forEach(filter => {
        locGroups[filter.category].mediaIds = mediaIds;
        if (this._localizationTypeNames.indexOf(filter.category) >= 0) {
          locGroups[filter.category].filters.push(filter);
        }
      });
    }

    var outData = await this._getData(outputType, locGroups, dataStart, dataStop);
    return outData;
  }

  /**
   * Retrieves a list of media data based on the given filters.
   * #TODO Currently, this will search through all media types.
   *
   * @param {string} outputType -
   *  ids|objects|count
   *
   * @param {array of FilterConditionData} filters -
   *   List of FilterConditionData to apply
   *   Only conditions associated with media will be applied
   *   If there are no filters, this will just return
   *
   * @param {integer} dataStart -
   *   Used in conjunction with dataStop and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {integer} dataStop =
   *   Used in conjunction with dataStart and pagination of data.
   *   If null, pagination is ignored.
   *
   * @returns {array of integers} List of media IDs matching the filter criteria
   */
  async getFilteredMedia(outputType, filters, dataStart, dataStop) {

    let mediaGroups = {};

    this._mediaTypes.forEach(mediaType => {
      mediaGroups[mediaType.name] = {entityType: mediaType, filters: []};
    });

    if (filters != undefined) {
      filters.forEach(filter => {
        if (this._mediaTypeNames.indexOf(filter.category) >= 0) {
          mediaGroups[filter.category].filters.push(filter);
        }
      });
    }

    var outData = await this._getData(outputType, mediaGroups, dataStart, dataStop);
    return outData;
  }
}