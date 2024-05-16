import { FilterConditionData } from "../../../util/filter-utilities.js";
import { TatorData } from "../../../util/tator-data.js";

/**
 * Class that contains the data about the annotation analytics gallery.
 * This provides an interface between the UI elements to the underlying data calls.
 */
export class AnnotationCardData extends HTMLElement {
  constructor() {
    super();

    this._stopChunk = 4000;
  }

  /**
   * @precondition The provided modelData must have been initialized
   * @param {TatorData} modelData
   */
  async init(modelData) {
    this._modelData = modelData;

    // this.mediaTypes = this._modelData.getStoredMediaTypes();
    this.mediaTypes = await this._modelData.getAllMediaTypes();
    this.mediaTypeMap = new Map();
    for (const mediaType of this.mediaTypes) {
      this.mediaTypeMap.set(mediaType.id, mediaType);
    }

    // this.localizationTypes = this._modelData.getStoredLocalizationTypes();
    this.localizationTypes = await this._modelData.getAllLocalizationTypes();
    this.localizationTypeMap = new Map();
    for (const locType of this.localizationTypes) {
      this.localizationTypeMap.set(locType.id, locType);
    }

    this.projectId = this._modelData.getProjectId();
    this.filterConditions = "";
  }

  /**
   * @param {array} filterConditions array of FilterConditionData objects
   */
  async _reload(filterConditions, sortState) {
    this.filterConditions = filterConditions;
    this.sortState = sortState;
    this.cardList = {};
    this.cardList.cards = [];
    this.cardList.total = await this._modelData.getFilteredLocalizations(
      "count",
      filterConditions,
      NaN,
      NaN,
      sortState
    );

    return true;
  }

  /**
   * Note: If the filters are in a different order, this will return with True still.
   * @param {array} filterConditions array of FilterConditionData objects
   * @param {string} sortState query param for sort
   * @returns True if reload() needs to be called
   */
  _needReload(filterConditions, sortState) {
    return (
      JSON.stringify(filterConditions) !=
      JSON.stringify(
        this.filterConditions ||
          JSON.stringify(sortState) != JSON.stringify(this.sortState)
      )
    );
  }

  /**
   * @param {array} localizations Localizations to displays in the annotation gallery
   * @returns {Promise}
   */
  _getCardList(localizations, medias) {
    return new Promise((resolve, reject) => {
      let counter = localizations.length;
      var haveCardShells = function () {
        if (counter <= 0) {
          resolve();
        }
      };

      // Handle the case where we get nothing back
      haveCardShells();

      for (let [i, l] of localizations.entries()) {
        let id = l.id;
        let mediaLink = this._modelData.generateMediaLink(
          l.media,
          l.frame,
          l.elemental_id,
          l.type,
          l.version
        );
        let entityType = this.localizationTypeMap.get(l.type);

        let attributes = l.attributes;
        let created = new Date(l.created_datetime);
        let modified = new Date(l.modified_datetime);
        let mediaId = l.media;

        let position = i + this.cardList.paginationState.start;
        let posText = `${position + 1} of ${this.cardList.total}`;

        let media;
        for (let idx = 0; idx < medias.length; idx++) {
          if (medias[idx].id == mediaId) {
            media = medias[idx];
            break;
          }
        }

        let mediaInfo = {
          id: mediaId,
          entityType: this.mediaTypeMap.get(media.type),
          attributes: media.attributes,
          media: media,
        };

        let card = {
          id,
          localization: l,
          entityType,
          mediaId,
          mediaInfo,
          mediaLink,
          attributes,
          created,
          modified,
          posText,
        };

        this.cardList.cards.push(card);
        counter--;
        haveCardShells();

        this._modelData.getLocalizationGraphic(l.id).then((image) => {
          this.dispatchEvent(
            new CustomEvent("setCardImage", {
              composed: true,
              detail: {
                id: l.id,
                image: image,
              },
            })
          );
        });
      }
    });
  }

  /**
   * @param {array} filterConditions array of FilterConditionData objects
   * @param {object} paginationState
   * @param {string} sortState
   * @returns {object}
   */
  async makeCardList(filterConditions, paginationState, sortState) {
    // console.log(filterConditions)
    // console.log(paginationState);
    if (this._needReload(filterConditions, sortState)) {
      await this._reload(filterConditions, sortState);
    }
    this.cardList.cards = [];
    this.cardList.paginationState = paginationState;
    this.cardList.sortState = sortState;

    // Get the localizations for the current page
    var localizations = await this._modelData.getFilteredLocalizations(
      "objects",
      filterConditions,
      paginationState.start,
      paginationState.stop,
      sortState
    );

    // Query the media data associated with each localization
    var mediaPromises = [];
    var mediaList = [];
    for (let idx = 0; idx < localizations.length; idx++) {
      if (!mediaList.includes(localizations[idx].media)) {
        mediaList.push(localizations[idx].media);
      }
    }

    // #TODO change this to the put command to get the object list
    //       this potentially could move to a separate async pathway
    for (let idx = 0; idx < mediaList.length; idx++) {
      mediaPromises.push(this._modelData.getMedia(mediaList[idx]));
    }
    var medias = await Promise.all(mediaPromises);

    // Now gather all the card information
    await this._getCardList(localizations, medias);
    return this.cardList;
  }

  /**
   * Updates the provided localization card's attributes
   * @param {} cardObj Modified by this function
   */
  async updateLocalizationAttributes(cardObj, newId) {
    var locData = await this._modelData.getLocalization(newId);
    cardObj.id = newId;
    cardObj.localization = locData;
    cardObj.attributes = locData.attributes;
    cardObj.created = new Date(locData.created_datetime);
    cardObj.modified = new Date(locData.modified_datetime);

    return cardObj;
  }

  /**
   * Updates the media attributes for all cards with the same media ID
   * @param {integer} mediaId - Media ID to retrieve and update cards with
   */
  async updateMediaAttributes(mediaId) {
    var media = await this._modelData.getMedia(mediaId);

    let mediaInfo = {
      id: mediaId,
      entityType: this.mediaTypeMap.get(media.type),
      attributes: media.attributes,
      media: media,
    };

    for (let card of this.cardList.cards) {
      if (card.mediaId == mediaId) {
        card.mediaInfo = mediaInfo;
      }
    }
  }

  async _bulkCaching(filterConditions, sortState) {
    let promise = Promise.resolve();

    console.log(filterConditions);
    console.log(sortState);
    if (
      this._needReload(filterConditions, sortState) ||
      typeof this._bulkCache == "undefined" ||
      this._bulkCache == null
    ) {
      this.filterConditions = filterConditions;
      this.sortState = sortState;
      this.cardList = { cards: [], total: null };
      this.cardList.total = await this._modelData.getFilteredLocalizations(
        "count",
        filterConditions,
        NaN,
        NaN,
        sortState
      );

      let stop =
        this.cardList.total > this._stopChunk
          ? this._stopChunk
          : this.cardList.total;

      this._bulkCache = await this._modelData.getFilteredLocalizations(
        "objects",
        filterConditions,
        0,
        stop,
        sortState
      );

      console.log("This is the prefetch results:");
      console.log(this._bulkCache);

      if (this.cardList.total > this._stopChunk) {
        let loops = Math.ceil(this.cardList.total / this._stopChunk);
        let start = this._stopChunk + 1;
        let stop = this._stopChunk + this._stopChunk;
        for (let x = 0; x < loops; x++) {
          console.log(
            `Getting next (chunk size ${this._stopChunk}) start: ${start} and stop: ${stop}`
          );
          let next = await this._modelData.getFilteredLocalizations(
            "objects",
            filterConditions,
            start,
            stop,
            sortState
          );
          this._bulkCache = [...this._bulkCache, ...next];
          start += this._stopChunk;
          stop += this._stopChunk;
        }
        console.log("This is the prefetch results after loops:");
        console.log(this._bulkCache);
      }

      this.filterConditions = filterConditions;
      this.sortState = sortState;
    } else {
      console.log("No change in filter condition.");
    }

    return promise;
  }

  /**
   * @param {array} filterConditions array of FilterConditionData objects
   * @param {object} paginationState
   * @param {string} sortState
   * @returns {object}
   */
  async makeCardListFromBulk(filterConditions, paginationState, sortState) {
    if (filterConditions.length == 0) {
      return this.makeCardList(filterConditions, paginationState, sortState);
    }
    // this will create a cached list if the filter is new, or if we haven't made it
    await this._bulkCaching(filterConditions, sortState);

    console.log(paginationState);
    this.cardList.cards = [];
    this.cardList.paginationState = paginationState;
    this.cardList.sortState = sortState;

    // Get the localizations for the current page
    const localizations = [];
    for (let x = paginationState.start; x < paginationState.stop; x++) {
      // const loc = await this._modelData.getLocalization(this._bulkCache[x]);
      if (this._bulkCache[x]) {
        const loc = this._bulkCache[x];
        localizations.push(loc);
      }
    }

    // Query the media data associated with each localization
    if (localizations.length > 0) {
      var mediaPromises = [];
      var mediaList = [];
      for (let idx = 0; idx < localizations.length; idx++) {
        if (
          localizations[idx] &&
          !mediaList.includes(localizations[idx].media)
        ) {
          mediaList.push(localizations[idx].media);
        }
      }

      // #TODO change this to the put command to get the object list
      //       this potentially could move to a separate async pathway
      for (let idx = 0; idx < mediaList.length; idx++) {
        mediaPromises.push(this._modelData.getMedia(mediaList[idx]));
      }
      var medias = await Promise.all(mediaPromises);

      // Now gather all the card information
      await this._getCardList(localizations, medias);
    }

    return this.cardList;
  }

  async updateBulkCache(data) {
    if (typeof this._bulkCache !== "undefined" || this._bulkCache !== null) {
      //await this._bulkCaching(this._filterConditions);
      for (let i in this._bulkCache) {
        if (this._bulkCache[i].id == data.localization.id) {
          console.log(`updating loc ${this._bulkCache[i].id}`);
          console.log(data);
          console.log(this._bulkCache[i]);
          this._bulkCache[i] = data.localization;
          console.log(`updated`);
          console.log(this._bulkCache[i]);
        }
      }
    }
  }
}

customElements.define("annotation-card-data", AnnotationCardData);
