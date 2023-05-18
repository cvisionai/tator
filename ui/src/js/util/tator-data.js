import { getCookie } from "./get-cookie.js";
import { FilterConditionData } from "./filter-utilities.js";
import { fetchRetry } from "./fetch-retry.js";

/**
 * Assumptions:
 * - All names given to types are unique
 **/
export class TatorData {

  constructor(project) {
    this._project = project;

    this._mediaTypes = [];
    this._mediaTypeNames = [];
    this._localizationTypes = [];
    this._localizationTypeNames = [];
    this._versions = [];
    this._sections = [];
    this._algorithms = [];
    this._stateTypes = [];
    this._stateTypeNames = [];
    this._stateTypeAssociations = {media: [], frame: [], localization: []};
    this._memberships = [];

    this._maxFetchCount = 100000;
  }

  getMaxFetchCount() {
    return this._maxFetchCount;
  }

  getProjectId() {
    return this._project;
  }

  getStoredMemberships() {
    return this._memberships;
  }

  getStoredLocalizationTypes() {
    return this._localizationTypes;
  }

  getStoredStateTypes() {
    return this._stateTypes;
  }

  getStoredMediaStateTypes() {
    return this._stateTypeAssociations.media;
  }

  getStoredLocalizationStateTypes() {
    return this._stateTypeAssociations.localization;
  }

  getStoredFrameStateTypes() {
    return this._stateTypeAssociations.frame;
  }

  getStoredMediaTypes() {
    return this._mediaTypes;
  }

  getStoredVersions() {
    return this._versions;
  }

  getStoredSections() {
    return this._sections;
  }

  getStoredAlgorithms() {
    return this._algorithms;
  }

  /**
   * #TODO May want to consider what it is actually necessary here to initialize with to speed up
   *       initial loading times. There typically aren't that many versions. There might be a good
   *       amount of sections.
   */
  async init() {
    await this.getAllLocalizationTypes();
    await this.getAllMediaTypes();
    await this.getAllVersions();
    await this.getAllSections();
    await this.getAllAlgorithms();
    await this.getAllStateTypes();
    await this.getAllUsers();
  }

  /**
   *
   */
  async getAllUsers() {

    var donePromise = new Promise(resolve => {
      const restUrl = "/rest/Memberships/" + this._project;
      const dataPromise = fetchRetry(restUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      dataPromise
      .then(response => response.json())
      .then(memberships => {
        this._memberships = memberships;
        resolve();
      });
    });

    await donePromise;
  }

  /**
   * Saves the list of localization types associated with this project
   */
   async getAllStateTypes() {

    var donePromise = new Promise(resolve => {

      const restUrl = "/rest/StateTypes/" + this._project;
      const dataPromise = fetchRetry(restUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      Promise.all([dataPromise])
        .then(([dataResponse]) => {
          const dataJson = dataResponse.json();
          Promise.all([dataJson])
        .then(([stateTypes]) => {
          this._stateTypes = [...stateTypes];
          this._stateTypeNames = [];
          this._stateTypes.forEach(typeElem => this._stateTypeNames.push(typeElem.name));

          // Also separate out the state types into the different association types
          this._stateTypeAssociations = {media: [], frame: [], localization: []};
          for (let idx=0; idx < this._stateTypes.length; idx++) {
            const stateType = this._stateTypes[idx];
            if (stateType.association == "Media") {
              this._stateTypeAssociations.media.push(stateType);
            }
            else if (stateType.association == "Localization") {
              this._stateTypeAssociations.localization.push(stateType);
            }
            else if (stateType.association == "Frame") {
              this._stateTypeAssociations.frame.push(stateType);
            }
          }

          resolve();
        });
      });

    });

    await donePromise;
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

    return this._localizationTypes;
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
    return this._mediaTypes;
  }

  /**
   * #TODO
   */
  async getAllVersions() {
    var donePromise = new Promise(resolve => {

      const versionsRestUrl = "/rest/Versions/" + this._project;
      const versionsPromise = fetchRetry(versionsRestUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      Promise.all([versionsPromise])
        .then(([versionsResponse]) => {
          const versionsJson = versionsResponse.json();
          Promise.all([versionsJson])
        .then(([versions]) => {
          this._versions = [...versions];
          resolve();
        });
      });

    });

    await donePromise;
  }

  /**
   * #TODO
   */
  async getAllSections() {
    var donePromise = new Promise(resolve => {

      const sectionsRestUrl = "/rest/Sections/" + this._project;
      const sectionsPromise = fetchRetry(sectionsRestUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      Promise.all([sectionsPromise])
        .then(([sectionsResponse]) => {
          const sectionsJson = sectionsResponse.json();
          Promise.all([sectionsJson])
        .then(([sections]) => {
          this._sections = [...sections];
          resolve();
        });
      });

    });

    await donePromise;
  }

  /**
   * #TODO
   */
   async getAllAlgorithms() {
    var donePromise = new Promise(resolve => {

      const restUrl = "/rest/Algorithms/" + this._project;
      const resultsPromise = fetchRetry(restUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      Promise.all([resultsPromise])
        .then(([resultsPromise]) => {
          const resultsJson = resultsPromise.json();
          Promise.all([resultsJson])
        .then(([algorithms]) => {
          this._algorithms = [...algorithms];
          resolve();
        });
      });

    });

    await donePromise;
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
   * Returns data for getLocalizationGraphic with project ID
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
   * Gets localization object based on ID
   */
  async getLocalization(localizationId){
    const response = await fetch(`/rest/Localization/${localizationId}`, {
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
   * Returns a Media data
   */
  async getMedia( mediaId ){
    const response = await fetch(`/rest/Media/${mediaId}?presigned=28800`, {
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
   * Returns a MediaType data
   */
  async getMediaType( mediaId ){
    const response = await fetch(`/rest/MediaType/${mediaId}`, {
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
   * Note: Much of this code has been copied from media-section.js
   *       The constants chosen are based on the Tator endpoint restrictions
   *
   * The "list" the pagination is operating on is based on the url
   *
   * @param {integer} start Desired start index in list
   * @param {integer} stop Desired stop index in list
   * @param {Map} afterMap Specific to the endpoint and search criteria combination. Modified here.
   * @param {string} url Tator REST endpoint list call with query but no pagination
   * @returns {integer} Undefined if after parameter is not needed.
   */
   async _getAfterParameter(start, stop, afterMap, url) {
    let afterPromise = Promise.resolve(null);
    var pageParameters;
    if ((start + stop) >= 10000) {
      const afterIndex = 5000 * Math.floor(start / 5000);
      const newStart = start % afterIndex;
      let newStop = stop % afterIndex;
      if (newStop < newStart) {
        newStop += 5000;
      }
      afterPromise = this._getAfter(afterIndex, afterMap, url);
      var afterParameter = await afterPromise;
      pageParameters = {after: afterParameter, start: newStart, stop: newStop};
    }
    else {
      pageParameters = {after: null, start: start, stop: stop};
    }
    return pageParameters;
  }


  /**
   * Note: Much of this code has been copied from media-section.js
   *       The constants chosen are based on the Tator endpoint restrictions
   *       Constants match up with _getAfterParameter()
   *
   * @param {integer} index
   * @param {string} endpointQuery URL safe query string
   * @param {Map} afterMap . Modified here.
   * @param {string} url Tator REST endpoint list call with query but no pagination
   */
  _getAfter(index, afterMap, url) {
    const recursiveFetch = (current) => {
      let after = "";
      if (afterMap.has(current - 5000)) {
        after = `&after=${afterMap.get(current - 5000)}`;
      }
      return fetch(`${url}&start=4999&stop=5000${after}&presigned=28800`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      })
      .then(response => response.json())
      .then(data => {
        afterMap.set(current, data[0].id);
        if (current < index) {
          return recursiveFetch(current + 5000);
        }
        return Promise.resolve(data[0].id);
      });
    }
    if (afterMap.has(index)) {
      return Promise.resolve(afterMap.get(index));
    } else {
      return recursiveFetch(5000);
    }
  }

  /**
   * Converts the given attribute name to a Tator search compliant string
   * @param {*} attrName - Name of attribute to convert
   * @returns {string} - Tator search compliant attribute name
   */
   _convertAttributeNameForSearch(attrName) {
    var searchName = attrName.replace(/ /g,"\\ ")
    searchName = searchName.replace(/\(/g,"\\(")
    searchName = searchName.replace(/\)/g,"\\)")
    return searchName;
  }

  /**
   * Utility function to process date filters
   *
   * @param {array} dateArray - array of objects representing a date range for the search
   * @param {string} attrName - associated attribute name
   * @param {string} endType - start|end
   * @param {string} value - isoformatted date
   * @returns {array} - dateArray modified with given inputs
   */
   _applyDateRange(dateArray, attrName, endType, value) {
    let idx = 0;
    while (idx < dateArray.length) {
      if (dateArray[idx].name == attrName) {
        if (endType == "start") {
          dateArray[idx].start = value;
        }
        else if (endType == "end") {
          dateArray[idx].end = value;
        }
        break;
      }
      idx++;
    }

    if (idx == dateArray.length) {
      if (endType == "start") {
        dateArray.push({
          name: attrName,
          start: value,
          end: "*"
        });
      }
      else if (endType == "end") {
        dateArray.push({
          name: attrName,
          start: "*",
          end: value
        });
      }
    }

    return dateArray;
  }

  /**
   * Converts given date range object to a Tator search compliant string
   * @param {Object} dateRange - see _applyDateRange output
   * @returns {string} - corresponding search compliant string
   */
  _convertDateRangeForTator(dateRange) {
    var attrName = this._convertAttributeNameForSearch(dateRange.name);
    var paramStr = `${attrName}:{${dateRange.start} TO ${dateRange.end}}`;
    return paramStr;
  }

  /**
   * @param {FilterConditionData} filter - Filter to convert
   * @returns {string} - Tator REST compliant parameter object
   */
  _convertFilterForTator(filter) {
    const modifier_lookup = {
      '==': 'eq',
      'NOT ==': 'eq',
      '>': 'gt',
      '<': 'lt',
      '>=': 'gte',
      '<=': 'lte',
      'After': 'gt',
      'Before': 'lt',
      'Includes': 'icontains',
      'Starts with': 'istartswith',
      'Ends with': 'iendswith',
      'Distance <=': 'distance_lte'
    }

    var modifier = filter.modifier;
    var value = filter.value;
    var field = filter.field;
    var filter_object = {};
    filter_object.attribute = field;
    filter_object.value = value;
    filter_object.operation = modifier_lookup[modifier];
    filter_object.inverse = (modifier.startsWith('NOT') ? true : false);

    return filter_object;
  }

  /**
   * @param {string} outputType ids|objects|count
   * @param {string} annotationType Localizations|States
   * @param {array of FilterConditionData} annotationFilterData
   * @param {array of FilterConditionData} mediaFilterData
   * @param {integer} listStart
   * @param {integer} listStop
   * @param {Map} afterMap
   * @param {array} mediaIds
   */
  async _getAnnotationData(
    outputType,
    annotationType,
    annotationFilterData,
    mediaFilterData,
    listStart,
    listStop,
    afterMap,
    mediaIds) {

    var finalAnnotationFilters = [];
    for (const filter of annotationFilterData) {
      finalAnnotationFilters.push(this._convertFilterForTator(filter));
    }

    // Annotation Search
    var paramString = "";
    var annotationSearchObject = {'method': 'and', 'operations': [...finalAnnotationFilters]};
    var annotationSearchBlob = btoa(JSON.stringify(annotationSearchObject));
    if (finalAnnotationFilters.length && annotationType != "Medias") {
      paramString += "&encoded_search=" + annotationSearchBlob;
    } else if (finalAnnotationFilters.length && annotationType == "Medias") {
      paramString += "&encoded_related_search=" + annotationSearchBlob;
    }

     // Media Filters
    var finalMediaFilters = [];
    for (const filter of mediaFilterData) {
      finalMediaFilters.push(this._convertFilterForTator(filter));
    }

    var mediaSearchObject = {'method': "and", 'operations':[...finalMediaFilters]};
    var mediaSearchBlob = btoa(JSON.stringify(mediaSearchObject));
    if (finalMediaFilters.length && annotationType != "Medias") {
      paramString += "&encoded_related_search=" + mediaSearchBlob;
    } else if (finalMediaFilters.length && annotationType == "Medias") {
      paramString += "&encoded_search=" + mediaSearchBlob;
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

    if (annotationType == "Localizations") {
      if (outputType == "count") {
        url += "/LocalizationCount/";
      }
      else {
        url += "/Localizations/";
      }
    }
    else if (annotationType == "States") {
      if (outputType == "count") {
        url += "/StateCount/";
      }
      else {
        url += "/States/";
      }
    }
    else if (annotationType == "Medias") {
      if (outputType == "count") {
        url += "/MediaCount/";
      }
      else {
        url += "/Medias/";
      }
    }

    url += `${this._project}?${paramString}`;
    if (!isNaN(listStart) && !isNaN(listStop) && afterMap != null) {
      // Note: & into paramString is taken care of by paramString itself
      var pageValues = await this._getAfterParameter(listStart, listStop, afterMap, url);
      url += `&start=${pageValues.start}&stop=${pageValues.stop}`;
      if (pageValues.after != undefined) {
        url += `&after=${pageValues.after}`;
      }
    }

    if (annotationType == "Medias") {
      url += "&presigned=28800";
    }

    console.log("Getting data with URL: " + url);
    var promises = [];
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
      } else if (outputType == "search-string") {
        var finalResults = mediaSearch;
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
   *
   * @param {string} outputType -
   *    ids|objects|count
   *
   * @param {array of FilterConditionData objects} filters -
   *    List of FilterConditionData to apply
   *    Only conditions associated with media and localizations will be applied.
   *
   * @param {integer} listStart -
   *   Used in conjunction with listStop and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {integer} listStop =
   *   Used in conjunction with listStart and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {Map} afterMap -
   *   Used in conjunction with the other pagination. Modified here.
   *   If null, pagination is ignored.
   *
   * @returns {array of integers}
   *    List of localization IDs matching the filter criteria
   */
  async getFilteredLocalizations(outputType, filters, listStart, listStop, afterMap) {

    // Loop through the filters, if there are any media specific ones
    var mediaFilters = [];
    var localizationFilters = [];
    var mediaIds = [];

    // Separate out the filter conditions into their groups
    if (Array.isArray(filters)) {
      filters.forEach(filter => {
        if (this._mediaTypeNames.indexOf(filter.category) >= 0) {
          if (filter.field == "$id") {
            mediaIds.push(Number(filter.value));
          }
          else if (filter.field.includes("$") && filter.value.includes("(ID:")) {
            var newFilter = Object.assign({}, filter);
            newFilter.value = Number(filter.value.split('(ID:')[1].replace(")",""));
            mediaFilters.push(newFilter);
          }
          else {
            mediaFilters.push(filter);
          }
        }
        else if (this._localizationTypeNames.indexOf(filter.category) >= 0) {
          if (filter.field.includes("$") && filter.value.includes("(ID:")) {
            var newFilter = Object.assign({}, filter);
            newFilter.value = Number(filter.value.split('(ID:')[1].replace(")",""));
            localizationFilters.push(newFilter);
          }
          else {
            localizationFilters.push(filter);
          }
        }
      });
    }

    var outData = await this._getAnnotationData(
      outputType,
      "Localizations",
      localizationFilters,
      mediaFilters,
      listStart,
      listStop,
      afterMap,
      mediaIds,
    );

    return outData;
  }

  /**
   * #TODO Requires testing when the collections gallery is exposed.
   *
   * Retrieves a list of state data matching the filter criteria
   *
   * @param {string} outputType -
   *    objects|count
   *
   * @param {array of FilterConditionData objects} filters -
   *    List of FilterConditionData to apply
   *    Only conditions associated with media and states will be applied.
   *
   * @param {integer} listStart -
   *   Used in conjunction with listStop and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {integer} listStop =
   *   Used in conjunction with listStart and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {Map} afterMap -
   *   Used in conjunction with the other pagination. Modified here.
   *   If null, pagination is ignored.
   *
   * @returns {array of integers}
   *    List of localization IDs matching the filter criteria
   */
   async getFilteredStates(outputType, filters, listStart, listStop, afterMap) {

    // Loop through the filters, if there are any media specific ones
    var mediaFilters = [];
    var stateFilters = [];
    var typeIds = [];
    var versionIds = [];
    var typePromises = [];
    var mediaIds = [];

    // Separate out the filter conditions into their groups
    if (Array.isArray(filters)) {
      filters.forEach(filter => {
        if (this._mediaTypeNames.indexOf(filter.category) >= 0) {
          if (filter.field == "$section") {
            var newFilter = Object.assign({}, filter);
            newFilter.field = "_section";
            newFilter.value = filter.value;
            mediaFilters.push(newFilter);
          }
          else if (filter.field == "_dtype") {
            var newFilter = Object.assign({}, filter);
            newFilter.field = "_meta";
            newFilter.value = filter.value.split('(ID:')[1].replace(")","");
            mediaFilters.push(newFilter);
          }
          else if (filter.field == "Modified By") {
            filter.field = "_modified_by";
            mediaFilters.push(filter);
          }
          else {
            mediaFilters.push(filter);
          }
        }
        else if (filter.category == "State") {
          stateFilters.push(filter);
        }
        else if (this._stateTypeNames.indexOf(filter.category) >= 0) {
          if (filter.field == "_version") {
            versionIds.push(Number(filter.value.split('(ID:')[1].replace(")","")));
          }
          else if (filter.field == "_type") {
            typeIds.push(Number(filter.value.split('(ID:')[1].replace(")","")));
          }
          else {
            stateFilters.push(filter);
          }
        }
      });
    }

    if (typeIds.length > 0) {
      typeIds.forEach(dtypeId => {
        typePromises.push(this._getAnnotationData(
          outputType,
          "States",
          stateFilters,
          mediaFilters,
          listStart,
          listStop,
          afterMap,
          mediaIds,
          versionIds,
          dtypeId
        ));
      });
    }
    else {
      typePromises.push(this._getAnnotationData(
        outputType,
        "States",
        stateFilters,
        mediaFilters,
        listStart,
        listStop,
        afterMap,
        mediaIds,
        versionIds
      ));
    }

    // Wait for all the data requests to complete. Once complete, return the appropriate data.
    var typeResults = await Promise.all(typePromises);
    var outData;
    if (outputType == "count") {
      outData = 0;
    }
    else {
      outData = [];
    }

    for (let idx = 0; idx < typeResults.length; idx++) {
      if (outputType == "count") {
        outData += Number(typeResults[idx]);
      }
      else {
        outData.push(...typeResults[idx]);
      }
    }
    return outData;
   }

  /**
   * Retrieves a list of media data matching the filter criteria
   *
   * @param {string} outputType -
   *    ids|objects|count
   *
   * @param {array of FilterConditionData objects} filters -
   *    List of FilterConditionData to apply
   *    Only conditions associated with media and localizations will be applied.
   *
   * @param {integer} listStart -
   *   Used in conjunction with listStop and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {integer} listStop =
   *   Used in conjunction with listStart and pagination of data.
   *   If null, pagination is ignored.
   *
   * @param {Map} afterMap -
   *   Used in conjunction with the other pagination. Modified here.
   *   If null, pagination is ignored.
   *
   * @returns {array of integers}
   *    List of localization IDs matching the filter criteria
   */
   async getFilteredMedias(outputType, filters, listStart, listStop, afterMap) {

    // Loop through the filters, if there are any media specific ones
    var mediaFilters = [];
    var localizationFilters = [];
    var locDtypeIds = [];
    var versionIds = [];
    var typePromises = [];
    var mediaIds = [];

    // Separate out the filter conditions into their groups
    if (Array.isArray(filters)) {
      filters.forEach(filter => {
        if (this._mediaTypeNames.indexOf(filter.category) >= 0) {
          if (filter.field == "_section") {
            var newFilter = Object.assign({}, filter);
            newFilter.field = "_section";
            newFilter.value = filter.value;
            mediaFilters.push(newFilter);
          }
          else if (filter.field == "_dtype") {
            var newFilter = Object.assign({}, filter);
            newFilter.field = "_meta";
            newFilter.value = filter.value.split('(ID:')[1].replace(")","");
            mediaFilters.push(newFilter);
          }
          else if (filter.field == "_id") {
            mediaIds.push(Number(filter.value))
          }
          else if (filter.field == "Modified By") {
            filter.field = "_modified_by";
            mediaFilters.push(filter);
          }
          else {
            mediaFilters.push(filter);
          }
        }
        else if (this._localizationTypeNames.indexOf(filter.category) >= 0) {
          if (filter.field == "$version" && filter.field.includes("(ID:")) {
            versionIds.push(Number(filter.value.split('(ID:')[1].replace(")","")));
          }
          else if (filter.field == "$type" && filter.field.includes("(ID:")) {
            locDtypeIds.push(Number(filter.value.split('(ID:')[1].replace(")","")));
          }
          else if (filter.field == "$user" && filter.field.includes("(ID:")) {
            var newFilter = Object.assign({}, filter);
            newFilter.field = "$user";
            newFilter.value = filter.value.split('(ID:')[1].replace(")","");
            localizationFilters.push(newFilter);
          }
          else {
            localizationFilters.push(filter);
          }
        }
      });
    }

    if (locDtypeIds.length > 0) {
      locDtypeIds.forEach(dtypeId => {
        typePromises.push(this._getAnnotationData(
          outputType,
          "Medias",
          localizationFilters,
          mediaFilters,
          listStart,
          listStop,
          afterMap,
          mediaIds,
          versionIds,
          dtypeId
        ));
      });
    }
    else {
      typePromises.push(this._getAnnotationData(
        outputType,
        "Medias",
        localizationFilters,
        mediaFilters,
        listStart,
        listStop,
        afterMap,
        mediaIds,
        versionIds
      ));
    }

    // Wait for all the data requests to complete. Once complete, return the appropriate data.
    var typeResults = await Promise.all(typePromises);
    var outData;
    if (outputType == "count") {
      outData = 0;
    }
    else {
      outData = [];
    }

    for (let idx = 0; idx < typeResults.length; idx++) {
      if (outputType == "count") {
        outData += Number(typeResults[idx]);
      }
      else {
        outData.push(...typeResults[idx]);
      }
    }
    return outData;
  }

  /**
   * Launches the given algorithm with the provided parameters
   * @param {string} algorithmName - Name of registered algorithm to launch
   * @param {array} parameters - Array of {name:..., value:...} objects
   *
   * #TODO Add media_query and media_ids parameters
   */
  async launchAlgorithm(algorithmName, parameters) {

    // Have to provide a valid media ID list or query for now. #TODO revisit

    var media_id;
    await fetchRetry(`/rest/Medias/${this._project}?start=0&stop=1`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    }).then((response) => {
      return response.json()
    }).then((results) => {
      media_id = results[0].id;
    });

    let body = {
      "algorithm_name": algorithmName,
      "extra_params": parameters,
      "media_ids": [media_id]
    }

    var launched = false;
    await fetchRetry("/rest/Jobs/" + this._project, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
    })
    .then(response => {
      if (response.status == 201) {
        launched = true;
      }
      return response.json();
    })
    .then(data => {
      console.log(data);
    });

    return launched;
  }

  /**
   * Creates a Tator link to the given media and provided parameters
   * Assumes the media is in the same project as this tator data module.
   * @param {integer} mediaId
   * @param {integer} frame - optional
   * @param {integer} entityId - optional
   * @param {integer} typeId - optional, will convert to Tator annotator friendly link
   * @param {integer} version - optional
   * @returns {str} Tator link using given parameters
   */
  generateMediaLink(mediaId, frame, entityId, typeId, version) {
    var outStr = `/${this._project}/annotation/${mediaId}?`;
    var addedParam = false;

    if (frame) {
      if (addedParam) {
        outStr += "&"
      }
      outStr += `frame=${frame}`;
      addedParam = true;
    }

    if (entityId) {
      if (addedParam) {
        outStr += "&"
      }
      outStr += `selected_entity=${entityId}`;
      addedParam = true;
    }

    if (typeId) {
      if (addedParam) {
        outStr += "&"
      }

      let annotatorTypeId;
      for (let type of this._localizationTypes) {
        if (type.id == typeId) {
          annotatorTypeId = type.dtype;
          break;
        }
      }
      annotatorTypeId += `_${typeId}`

      outStr += `selected_type=${annotatorTypeId}`;
      addedParam = true;
    }

    if (version) {
      if (addedParam) {
        outStr += "&"
      }
      outStr += `version=${version}`;
      addedParam = true;
    }

    return outStr;
  }
}
