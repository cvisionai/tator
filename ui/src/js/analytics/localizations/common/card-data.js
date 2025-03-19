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
    var filterConditionsMatch =
      JSON.stringify(filterConditions) == JSON.stringify(this.filterConditions);
    if (!filterConditionsMatch) {
      return true;
    }

    var sortStateMatch =
      JSON.stringify(sortState) == JSON.stringify(this.sortState);
    if (!sortStateMatch) {
      return true;
    }
    return false;
  }

  /**
   * @param {array} localizations Localizations to displays in the annotation gallery
   * @returns {Promise}
   */
  _getCardList(localizations, medias) {
    return new Promise(async (resolve, reject) => {
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
      }

      let promiseBatch = [];
      for (let [i, l] of localizations.entries()) {
        promiseBatch.push(
          this._modelData.getLocalizationGraphic(l.id).then((image) => {
            console.log(`Dispatching image event for localization ${l.id}!`);
            this.dispatchEvent(
              new CustomEvent("setCardImage", {
                composed: true,
                detail: {
                  id: l.id,
                  image: image,
                },
              })
            );
          })
        );
        // Only fetch five graphics at a time
        if (promiseBatch.length % 5 == 0) {
          console.log(`Waiting for ${promiseBatch.length} images to load...`);
          await Promise.all(promiseBatch);
        }
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

    var medias = await this._modelData.getMediaListByIds(mediaList);

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
}

customElements.define("annotation-card-data", AnnotationCardData);
