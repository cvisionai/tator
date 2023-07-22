import { FilterConditionData } from "../../util/filter-utilities.js";
import { TatorData } from "../../util/tator-data.js";

/**
 * Class that contains the data about the collections analytics gallery.
 * This provides an interface between the UI elements to the underlying data calls.
 *
 * This will retrieve media-associated states
 */
export class CollectionsData extends HTMLElement {
  constructor() {
    super();
  }

  /**
   * @precondition The provided modelData must have been initialized
   * @param {TatorData} modelData
   */
  init(modelData) {
    this._modelData = modelData;

    var mediaStateTypes = this._modelData.getStoredMediaStateTypes();
    var locStateTypes = this._modelData.getStoredLocalizationStateTypes();
    this._stateTypes = mediaStateTypes.concat(locStateTypes);

    this._stateTypesMap = new Map();
    for (const stateType of this._stateTypes) {
      this._stateTypesMap.set(stateType.id, stateType);
    }

    this.getCollectionsFilter();
    this._totalStateCount = 0;
    this.filterConditions = null;
  }

  /**
   * @param {array} filterConditions array of FilterConditionData objects
   */
  async _reload(filterConditions) {
    this.filterConditions =
      filterConditions !== null && Array.isArray(filterConditions)
        ? filterConditions.concat(this.collectionsFilter)
        : this.collectionsFilter;
    this._totalStateCount = await this._modelData.getFilteredStates(
      "count",
      this.filterConditions
    );
  }

  /**
   * Note: If the filters are in a different order, this will return with True still.
   * @param {array} filterConditions array of FilterConditionData objects
   * @returns True if reload() needs to be called
   */
  _needReload(filterConditions) {
    let compareConditions =
      filterConditions !== null && Array.isArray(filterConditions)
        ? filterConditions.concat(this.collectionsFilter)
        : this.collectionsFilter;
    return (
      JSON.stringify(this.filterConditions) != JSON.stringify(compareConditions)
    );
  }

  /**
   * Note: Utilizes internal paginationState
   * @param {array} filterConditions array of FilterConditionData objects
   * @postconditions
   *   getState
   */
  async updateData(filterConditions) {
    if (this._stateTypesMap.size !== 0) {
      if (this._needReload(filterConditions)) {
        await this._reload(filterConditions);
      }

      this._states = await this._modelData.getFilteredStates(
        "objects",
        this.filterConditions,
        this._paginationState.start,
        this._paginationState.stop,
        this.afterMap
      );

      this._states = this._states.map((state) => {
        return { ...state, typeData: this._stateTypesMap.get(state.type) };
      });
    } else {
      this._states = [];
    }

    return this._states;
  }

  getCollectionsFilter() {
    this.collectionsFilter = [];
    let count = 0;
    let string = "( ";

    for (let [key, value] of this._stateTypesMap.entries()) {
      if (count == 0) {
        string += `${key}`;
      } else {
        string += ` OR ${key}`;
      }
      count++;
    }
    string += ` )`;

    this.collectionsFilter.push({
      category: "State",
      field: "_meta",
      modifier: "OR",
      value: string,
    });
    // console.log(this.collectionsFilter)

    return this.collectionsFilter;
  }

  getStates() {
    return this._states;
  }

  getStateTypes() {
    return this._stateTypes;
  }

  getNumberOfResults() {
    return this._totalStateCount;
  }

  getPage() {
    return this._paginationState.page;
  }

  getPageSize() {
    return this._paginationState.pageSize;
  }

  getPaginationState() {
    return this._paginationState;
  }

  /**
   * @param {object} paginationState
   *   Must have the following fields:
   *     start
   *     stop
   *     page
   *     pageSize
   *     init
   */
  setPaginationState(paginationState) {
    this._paginationState = paginationState;
  }
}

customElements.define("collections-data", CollectionsData);
