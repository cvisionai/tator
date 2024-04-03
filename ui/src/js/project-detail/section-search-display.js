import { TatorElement } from "../components/tator-element.js";
import { processAttributeCombinatorSpec } from "../util/filter-utilities.js";

/**
 * Displays the AttributeOperationSpec in a human readable format
 */
export class SectionSearchDisplay extends TatorElement {

  /**
   * Class constructor
   */
  constructor() {
    super();
    this.setupUI();
    this._memberships = [];
    this._sections = [];
    this._versions = [];
  }

  /**
   * Called during constructor
   */
  setupUI() {
    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute("class", "d-flex flex-grow flex-column px-2 py-2 rounded-2");
    this._mainDiv.style.border = "1px solid #262e3d";
    this._shadow.appendChild(this._mainDiv);

    var titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "f2 text-white text-semibold px-2 py-1");
    titleDiv.textContent = "Saved Search Conditions";
    titleDiv.style.minWidth = "110px";
    this._mainDiv.appendChild(titleDiv);

    this._objectDiv = document.createElement("div");
    this._objectDiv.setAttribute("class", "d-flex flex-items-center flex-grow py-1");
    this._mainDiv.appendChild(this._objectDiv);

    var titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "f2 text-gray text-semibold px-2");
    titleDiv.textContent = "Object Search:";
    titleDiv.style.minWidth = "110px";
    this._objectDiv.appendChild(titleDiv);

    this._objectOperationDiv = document.createElement("div");
    this._objectOperationDiv.setAttribute("class", "f2 text-dark-gray px-2");
    this._objectDiv.appendChild(this._objectOperationDiv);

    this._relatedDiv = document.createElement("div");
    this._relatedDiv.setAttribute("class", "d-flex flex-items-center flex-grow py-1");
    this._mainDiv.appendChild(this._relatedDiv);

    var titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "f2 text-gray text-semibold px-2");
    titleDiv.textContent = "Related Search:";
    titleDiv.style.minWidth = "110px";
    this._relatedDiv.appendChild(titleDiv);

    this._relatedOperationDiv = document.createElement("div");
    this._relatedOperationDiv.setAttribute("class", "f2 text-dark-gray px-2");
    this._relatedDiv.appendChild(this._relatedOperationDiv);
  }

  /**
   * Initialize the lookup to translate the ID in the saerch to their logical names
   * @param {array} memberships 
   * @param {array} sections 
   * @param {array} versions 
   */
  init(memberships, sections, versions) {
    this._memberships = memberships;
    this._sections = sections;
    this._versions = versions;
  }

  /**
   * @param {Tator.AttributeCombinatorSpec} objectSearch
   * @param {Tator.AttributeCombinatorSpec} relatedSearch
   * @postcondition UI is updated to display the object search and related search
   */
  setDisplay(objectSearch, relatedSearch) {

    if (objectSearch == null) {
      this._objectOperationDiv.innerHTML = "None";
    }
    else {
      var stringTokens = processAttributeCombinatorSpec(objectSearch, this._memberships, this._sections, this._versions);
      var operationString = stringTokens.join(" ");
      this._objectOperationDiv.innerHTML = operationString;
    }

    if (relatedSearch == null) {
      this._relatedOperationDiv.innerHTML = "None";
    }
    else {
      var stringTokens = processAttributeCombinatorSpec(relatedSearch, this._memberships, this._sections, this._versions);
      var operationString = stringTokens.join(" ");
      this._relatedOperationDiv.innerHTML = operationString;
    }
  }
}
customElements.define("section-search-display", SectionSearchDisplay);