import { TatorElement } from "../tator-element.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class GalleryBulkEdit extends TatorElement {
  constructor() {
    super();

    // Message Panel
    this._bulkEditBar = document.createElement("div");
    this._bulkEditBar.setAttribute("class", "bulk-edit-bar px-3 hidden py-4");
    this._shadow.appendChild(this._bulkEditBar);

    /**
     * Listen for actions: edit and compare to change panel
     */
    this._selectionPanel = document.createElement(
      "entity-gallery-multi-selection-panel"
    );
    // this._selectionPanel.addEventListener("bulk-edit-click", this._showEditPanel.bind(this));
    this._selectionPanel.addEventListener(
      "bulk-edit-click",
      this._saveBulkEdit.bind(this)
    );
    this._selectionPanel.addEventListener(
      "comparison-click",
      this._showComparisonPanel.bind(this)
    );
    this._selectionPanel.addEventListener(
      "clear-selection",
      this._clearSelection.bind(this)
    );
    this._selectionPanel.addEventListener(
      "select-all",
      this.selectAllOnPage.bind(this)
    );
    // this._bulkEditBar.appendChild(this._selectionPanel);

    // Edit panel
    this._editPanel = document.createElement(
      "entity-gallery-multi-attribute-edit-panel"
    );
    this._editPanel.addEventListener(
      "select-click",
      this._showSelectionPanel.bind(this)
    ); // Back
    this._editPanel.addEventListener(
      "save-edit-click",
      this._saveBulkEdit.bind(this)
    );
    this._editPanel.addEventListener(
      "comparison-click",
      this._showComparisonPanel.bind(this)
    );
    this._selectionPanel.addEventListener(
      "clear-selection",
      this._clearSelection.bind(this)
    );
    this._editPanel.hidden = true;
    this._bulkEditBar.appendChild(this._editPanel);

    // Comparison panel
    this._comparisonPanel = document.createElement(
      "entity-gallery-attribute-comparison-panel"
    );
    this._comparisonPanel.addEventListener(
      "select-click",
      this._showSelectionPanel.bind(this)
    ); // Back
    this._comparisonPanel.addEventListener(
      "save-edit-click",
      this._showEditPanel.bind(this)
    );
    this._comparisonPanel.addEventListener(
      "comparison-click",
      this._showComparisonPanel.bind(this)
    );
    this._comparisonPanel.hidden = true;
    this._bulkEditBar.appendChild(this._comparisonPanel);

    // When someone starts shift select, then we connect between the two
    // If they haven't shift + selected, just single select
    this._editMode = false;
    this._shiftSelect = false;
    this._ctrlSelect = false;

    this._shiftSelectedFirst = null;
    this._shiftSelectedNext = null;

    // Listen to escape or Close
    document.addEventListener("keydown", this._keyDownHandler.bind(this));
    this._selectionPanel.xClose.addEventListener(
      "click",
      this._escapeEditMode.bind(this)
    );
    this._editPanel.xClose.addEventListener(
      "click",
      this._escapeEditMode.bind(this)
    );

    this._editPanel._bulkEditModal.addEventListener("close", () => {
      if (this._page) {
        this._page.hideDimmer();
      }
    });

    // Data holders for maintaining panels
    this._currentMultiSelection = new Set();
    this._currentMultiSelectionToId = new Map();
    this._currentSelectionObjects = new Map();
    this._localizationTypes = new Set();
    this.setOfSelectedMetaIds = new Set();

    // Flags for the UI
    this._editPanelWasOpen = false;
    this.resultsFilter = {
      containsAttributes: false,
      attributes: [],
      filterObj: {},
    };

    this._requiresPrefetch = false;
  }

  set elementList(val) {
    // console.log("this._elements  updated");
    // console.log(this._elements);
    this._elements = val;
  }

  set elementIndexes(val) {
    this._elementIndexes = val;
  }

  init({
    page,
    gallery,
    type = "localization",
    projectId = null,
    additionalTools = false,
    permission,
    bulkInit = false,
  }) {
    this._page = page;
    this._projectId = this._page.projectId;
    this._editType = type;
    this._permission = permission;



    if (type == "media") {
      this._editPanel._selectionCountText.textContent = "Media(s)";
      this._editPanel.xClose.classList.remove("hidden");
      this._selectionPanel.xClose.classList.remove("hidden");  
    }

    if (additionalTools) {
      this._editPanel.tools = additionalTools;
    }

    if (gallery == null) {
      this._gallery = this._page._filterResults;
    } else {
      this._gallery = gallery;
    }
    if (bulkInit) this.startEditMode();
  }

  _keyDownHandler(e) {
    if (this._editMode === true) {
      if (e.key == "Escape") {
        this._clearSelection();
      }

      if (e.code == "Control") {
        if (e.code == "a" || e.code == "A") {
          if (this._permission == "View Only") return;
          this.selectAllOnPage();
        }
      }

      if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (this._permission == "View Only") return;
        this.selectAllOnPage();
      }
    }
  }

  selectAllOnPage() {
    if (!this._editMode) this.startEditMode();
    for (let el of this._elements) {
      let id = el.card.cardObj.id;
      if (!this._currentMultiSelection.has(id)) {
        if (el.card._li.classList.contains("is-selected")) {
          //this._removeSelected({ element:el.card, id, isSelected: el.card._li.classList.contains("is-selected") });
        } else {
          this._addSelected({
            element: el.card,
            id,
            isSelected: el.card._li.classList.contains("is-selected"),
          });
        }
      }
    }
  }

  _addSelected({ element, id, isSelected }) {
    // console.log("Add selected");
    if (!this._editMode) this.startEditMode();

    element._li.classList.add("is-selected");
    element._multiSelectionToggle = true;

    this._currentMultiSelection.add(id);
    this._currentSelectionObjects.set(id, element.cardObj);
    this.setOfSelectedMetaIds.add(element.cardObj.entityType.id);
    this._updatePanelCount(this._currentMultiSelection.size);
    this._editPanel.hideShowTypes(this.setOfSelectedMetaIds);
    let entityId = element.cardObj.entityType.id;

    // list is a set to ensure uniqueness of additions in list
    let list =
      typeof this._currentMultiSelectionToId.get(entityId) !== "undefined"
        ? this._currentMultiSelectionToId.get(entityId)
        : new Set();
    list.add(id);

    this._currentMultiSelectionToId.set(entityId, list);
  }

  _removeSelected({ element, id, isSelected }) {
    // console.log("remove selected");
    if (isSelected) {
      element._li.classList.remove("is-selected");
    }

    this._currentMultiSelection.delete(id);
    this._currentSelectionObjects.delete(id);

    let entityId = element.cardObj.entityType.id;
    let idsInType = this._currentMultiSelectionToId.get(entityId);

    if (idsInType.length == 1) {
      // if the only id selected for this type is this one, then clean it out and update view
      this._currentMultiSelectionToId.delete(entityId);
      this.setOfSelectedMetaIds.delete(entityId);
      this._editPanel.hideShowTypes(this.setOfSelectedMetaIds);
    } else {
      // just remove it from the selection list
      idsInType.delete(id);
      this._currentMultiSelectionToId.set(entityId, idsInType);
    }

    this._updatePanelCount(this._currentMultiSelection.size);
  }

  _updatePanelCount(count) {
    this._count = count;
    this._editPanel.setCount(count);
  }

  _openEditMode(e) {
    if (e.detail.isSelected) {
      this._removeSelected(e.detail);
    } else {
      this._addSelected(e.detail);
    }

    this._updatePanelCount(this._currentMultiSelection.size);
  }

  // Used on pagination, and in clear selection
  clearAllCheckboxes() {
    if (this._elements && this._elements.length > 0) {
      for (let el of this._elements) {
        el.card._li.classList.remove("is-selected");
        el.card._multiSelectionToggle = false;
      }
    }
  }

  _clearSelection() {
    // console.log("CLEARING SELECTION! (in _clearSelection) ");
    this._currentMultiSelection.clear();
    this._currentSelectionObjects.clear();
    this._currentMultiSelectionToId.clear();
    // this._currentSelectionObjects.clear();
    this.setOfSelectedMetaIds.clear();
    this._editPanel.hideShowTypes(this.setOfSelectedMetaIds);

    this.clearAllCheckboxes();
    this._updatePanelCount(0);
  }

  resetElements() {
    this.elementList = [];
    this.elementIndexes = [];
  }

  startEditMode() {
    // console.log("startEditMode");
    this._editMode = true;

    if (this._elements) {
      for (let el of this._elements) {
        const cardFromEl =
          typeof el.cardInfo != "undefined" ? el.cardInfo.card : el.card;
        cardFromEl.multiEnabled = true;
        if (
          cardFromEl._li.classList.contains("is-selected") &&
          !this._currentMultiSelection.has(cardFromEl.cardObj.id)
        ) {
          this._addSelected({
            element: cardFromEl,
            id: cardFromEl.cardObj.id,
            isSelected: cardFromEl._li.classList.contains("is-selected"),
          });
        }
      }
    }

    // show edit drawer and tools
    this._bulkEditBar.classList.remove("hidden");

    if (this._editType != "media") {
      if (this._page.main.classList.contains("col-9")) {
        // console.log("_editPanelWasOpen is being set to true");
        this._editPanelWasOpen = true;
        this._page.main.classList.remove("col-9");
        this._page.main.classList.add("col-12");
      } else {
        this._editPanelWasOpen = false;
      }
    }

    this._gallery._ul.classList.add("multi-select-mode");
    this.dispatchEvent(new Event("multi-enabled"));

    if (this.resultsFilter.containsAttributes == true) {
      this._editPanel.addEventListener("attribute-is-filtered-on", (e) => {
        if (e.detail.names.length > 0) {
          // console.log("Setting this._requiresPrefetch = true");
          this._requiresPrefetch = true;
        } else {
          // console.log("Setting this._requiresPrefetch = false");
          this._requiresPrefetch = false;
        }
      });
    }

    this._showEditPanel(true);
  }

  _escapeEditMode(e) {
    e.preventDefault();
    this._editMode = false;

    // hide edit drawer and tools
    this._bulkEditBar.classList.add("hidden");

    // In correction page this panel stays open, in media is it open / shut
    if (this._editType == "media" && !this._selectionPanel.isHidden()) {
      this._selectionPanel.show(false);
    }

    if (this._editPanelWasOpen && this._editType != "media") {
      this._page.main.classList.add("col-9");
      this._page.main.classList.remove("col-12");
      // reset this
      this._editPanelWasOpen = false;
    }

    // revert page elements
    this._page._header.classList.remove("hidden");
    this._page.aside.classList.remove("hidden");
    this._page.main.style.marginTop = "0";
    this._gallery._ul.classList.remove("multi-select-mode");

    this._clearSelection();
    this.dispatchEvent(new Event("multi-disabled"));

    if (this._elements) {
      for (let el of this._elements) {
        const cardFromEl =
          typeof el.cardInfo != "undefined" ? el.cardInfo.card : el.card;
        cardFromEl.multiEnabled = false;
      }
    }

    this._editPanel.removeEventListener("attribute-is-filtered-on", (e) => {
      if (e.detail.names.length > 0) {
        // console.log("Setting this._requiresPrefetch = true");
        this._requiresPrefetch = true;
      } else {
        // console.log("Setting this._requiresPrefetch = false");
        this._requiresPrefetch = false;
      }
    });
  }

  _showSelectionPanel(val = true) {
    this._selectionPanel.show(val);
    if (!this._editMode) this.startEditMode();
  }
  _showEditPanel(val = true) {
    this._selectionPanel.show(true);
    this._editPanel.show(true); //val
  }

  _showComparisonPanel(val = true) {
    if (val) {
      this._editPanel.show(false);
      this._selectionPanel.show(false);
    }

    this._editPanel.hideShowTypes(this.setOfSelectedMetaIds);
    let shownAttributes = this._editPanel.shownAttrNames();
    this._editPanel.toggleAttribute("hide");
    this._comparisonPanel.init({ columns: shownAttributes });

    if (
      typeof this._currentSelectionObjects !== "undefined" ||
      this._currentSelectionObjects !== null
    ) {
      this._comparisonPanel._refreshTable(this._currentSelectionObjects);
    }
    this._comparisonPanel.show(val);
  }

  _saveBulkEdit() {
    this._saveConfirmation();
  }

  // This feature was to compare the values of selected attributes and cards in a table
  // This never went live // triggers were hidden or disconnected
  _showMiniComparison(val = true) {
    this._editPanel.showComparison(val);
  }

  _saveConfirmation() {
    let button = document.createElement("button");
    button.setAttribute("class", "save-confirmation btn f1 text-semibold");
    let confirmText = document.createTextNode("Yes");
    button.appendChild(confirmText);

    let typeText = this._editType == "media" ? "Media(s)" : "Localization(s)";
    let text = `<h2 class="py-2 h3">Edit ${this._currentMultiSelection.size} ${typeText}?</h2>`;

    let inputValueArray = this._editPanel.getValue();

    let formData = [];
    for (let r of inputValueArray) {
      // Inputs are associated to multiple types
      // - If there are inputs for this types
      // - currentMultiSelectionToId maps the selected IDs to the TypeId
      // - There may be no selected items with that type
      if (r.typeId !== "") {
        // Are there any selected cards this MediaType?
        // - Note: To handle if we put info in an input, but no media selected to apply it to
        const mediaTypeInSelection =
          typeof this._currentMultiSelectionToId.get(Number(r.typeId)) !==
            "undefined" &&
          this._currentMultiSelectionToId.get(Number(r.typeId)).size > 0;
        // console.log("Is this media type in the selection? ...... "+mediaTypeInSelection);

        // What are the inputes related to this type?
        // - Note: To handle if we selected some media, but no input applies to it
        const inputShownForSelectedType = Object.entries(r.values).length > 0;
        // console.log("Are there input values? ...... "+inputShownForSelectedType);

        // We have inputs
        if (inputShownForSelectedType) {
          // and cards for this media

          if (mediaTypeInSelection) {
            text += `<p class="py-2 text-bold text-gray">Update summary for ${
              this._currentMultiSelectionToId.get(Number(r.typeId)).size
            } ${typeText} with Type ID: ${r.typeId}</p>`;
          }

          for (let [name, value] of Object.entries(r.values)) {
            if (mediaTypeInSelection) {
              text += `<p class="py-2 px-2 ${
                mediaTypeInSelection ? "text-gray" : "text-red"
              }">- Change attribute '${name}' to value: <span class="text-italics ">${value}</span></p>`;
            } else {
              // inputs and no cards
              text += `<p class="py-2 text-bold text-red">No update for Type ID: ${r.typeId} `;
              text += `<p class="py-2 px-2 text-red text-italics"> - No items selected to change '${name}' to value: <span class="text-italics ">${value}</span></p></p>`;
            }
          }

          if (mediaTypeInSelection) {
            // console.log("Making form data.......");
            let formDataForType = {
              attributes: r.values,
              ids: Array.from(
                this._currentMultiSelectionToId.get(Number(r.typeId))
              ), //Array.from(this._currentMultiSelection)
            };

            formData.push(formDataForType);
          }
        } else {
          // no attribute, but cards are selected
          if (mediaTypeInSelection) {
            text += `<p class="py-2 text-bold text-red">Update summary for ${
              this._currentMultiSelectionToId.get(Number(r.typeId)).size
            } ${typeText} with Type ID: ${r.typeId}</p>`;
            text += `<p class="py-2 px-2 text-red text-italics"> - Attribute does not exist on this type</p>`;
          } else {
            // no attribute and no cards -- do nothing
          }
        }

        if (Object.entries(r.rejected).length > 0) {
          for (let rej of Object.entries(r.rejected)) {
            text += `<p class="text-red py-2 px-2">- Will not update attribute '${rej[0]}' - value is invalid, or null.</p>`;
          }
        }
      }
    }

    // console.log(`formData.length = ${formData.length}`)
    // Save button is disabled if there are 0 total selected, so there should be formData - otherwise there was a bug
    if (formData.length == 0) {
      return this._page.modal._error(
        "Error with update: No selection found.",
        "Error"
      );
    }

    let buttonContinue = document.createElement("button");
    buttonContinue.setAttribute("class", "btn f1 text-semibold");
    let confirmTextContinue = document.createTextNode("Select More");
    buttonContinue.appendChild(confirmTextContinue);

    let buttonExit = document.createElement("button");
    buttonExit.setAttribute(
      "class",
      "btn  btn-charcoal btn-clear f1 text-semibold"
    );

    let confirmTextExit = document.createTextNode("Exit Select Mode");
    buttonExit.appendChild(confirmTextExit);

    button.addEventListener("click", (e) => {
      this.handleEdit(e, formData);
    });

    buttonContinue.addEventListener("click", (e) => {
      this._page.modal._closeCallback();
      this._showSelectionPanel();
    });

    buttonExit.addEventListener("click", (e) => {
      this._page.modal._closeCallback();
      this._escapeEditMode();
    });

    this._page.modal._confirm({
      titleText: `Confirm`,
      mainText: text,
      buttonSave: button,
      scroll: false,
    });
  }

  _patchMedia(formData) {
    return fetchCredentials(`/rest/Medias/${this._projectId}`, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(formData),
    });
  }

  _patchLocalizations(formData) {
    // console.log("Bulk edit this._projectId" + this._projectId);
    return fetchCredentials(`/rest/Localizations/${this._projectId}`, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(formData),
    });
  }

  handleEdit(e, formData) {
    if (this._editType == "media") {
      this._editMedia(e, formData);
    } else {
      this._editLocalization(e, formData);
    }
  }

  _editMedia(e, formData) {
    // button.addEventListener("click", (e) => {
    e.preventDefault();
    this._page.modal._closeCallback();
    this._page.showDimmer();
    this._page.loading.showSpinner();
    let promise = Promise.resolve();
    let text = "";
    let errorText = "";
    let respCode = 0;

    for (let jsonData of formData) {
      // console.log("jsonData-----------------------------------------------------------");
      // console.log(jsonData);

      if (Object.entries(jsonData.attributes).length > 0) {
        promise = promise
          .then(() => this._patchMedia(jsonData))
          .then((resp) => {
            respCode = resp.status;
            // console.log(respCode);
            return resp.json();
          })
          .then((data) => {
            // console.log("Then reading message");
            if (respCode == "200") {
              text += `${data.message} <br/><br/>`;
              this.updateSelectionObjects(jsonData);
            } else {
              errorText += `${data.message} <br/><br/>`;
              // this.updateSelectionObjects(jsonData);
            }
          });
      }
    }

    return promise
      .then(() => {
        // console.log("Then clean up");
        this._editPanel.resetWidgets();
        this.dispatchEvent(
          new CustomEvent("bulk-attributes-edited", {
            detail: {
              editedIds: this._currentMultiSelection,
              editedObjs: this._currentSelectionObjects,
            },
          })
        );
        this._clearSelection();
        this._page.loading.hideSpinner();
        this._page.hideDimmer();

        if (errorText === "" && text !== "") {
          this._page.modal._success(text);
        } else if (errorText !== "" && text === "") {
          this._page.modal._error(errorText, "Error");
        } else if (errorText !== "" && text !== "") {
          this._page.modal._error(
            `<p>${text}</p><p class="text-red">${errorText}</p>`
          );
        }

        // });
      })
      .catch((err) => {
        this._clearSelection();
        this._page.loading.hideSpinner();
        this._page.hideDimmer();
        return this._page.modal._error("Error with update: " + err);
      });

    // });
  }

  _editLocalization(e, formData) {
    // console.log("_editLocalization");
    // button.addEventListener("click", (e) => {
    e.preventDefault();
    this._page.modal._closeCallback();
    this._page.showDimmer();
    this._page.loading.showSpinner();
    let promise = Promise.resolve();
    let text = "";
    let errorText = "";
    let respCode = 0;

    for (let jsonData of formData) {
      // console.log(jsonData);
      promise = promise
        .then(() => this._patchLocalizations(jsonData))
        .then((resp) => {
          respCode = resp.status;
          // console.log(respCode);
          return resp.json();
        })
        .then((data) => {
          // console.log("Then reading message");
          if (respCode == "200") {
            text += `${data.message} <br/><br/>`;
            this.updateSelectionObjects(jsonData);
          } else {
            errorText += `${data.message} <br/><br/>`;
            // this.updateSelectionObjects(jsonData);
          }
        });
    }

    return promise
      .then(() => {
        // console.log("Then clean up");
        this._editPanel.resetWidgets();
        this.dispatchEvent(
          new CustomEvent("bulk-attributes-edited", {
            detail: {
              editedIds: this._currentMultiSelection,
              editedObjs: this._currentSelectionObjects,
            },
          })
        );
        this._clearSelection();
        this._page.loading.hideSpinner();
        this._page.hideDimmer();

        if (errorText === "" && text !== "") {
          this._page.modal._success(text);
        } else if (errorText !== "" && text === "") {
          this._page.modal._error(errorText, "Error");
        } else if (errorText !== "" && text !== "") {
          this._page.modal._error(
            `<p>${text}</p><p class="text-red">${errorText}</p>`
          );
        }

        // });
      })
      .catch((err) => {
        this._clearSelection();
        this._page.loading.hideSpinner();
        this._page.hideDimmer();
        return this._page.modal._error("Error with update: " + err);
      });

    // });
  }

  _updateShownAttributes({ typeId, values }) {
    // console.log(values);
    this._editPanel.setSelectionBoxValue({ typeId, values });
    // this._comparisonPanel.newColumns({ typeId, values });
  }

  updateSelectionObjects(formData) {
    for (let id of this._currentMultiSelection) {
      let newCardData = this._currentSelectionObjects.get(id);
      if (typeof newCardData !== "undefined") {
        if (formData.attributes) {
          for (let [a, b] of Object.entries(formData.attributes)) {
            newCardData.attributes[a] = b;
          }
        }
        // console.log(newCardData);
        this._gallery.updateCardData(newCardData);
        if (this._page.cardData) {
          this._page.cardData.updateBulkCache(newCardData);
        } else if (this._page._mediaSection) {
          this._page._mediaSection.reload();
        }
      } else {
        console.warn(
          "Possibly an error with save. Could not find ID in currentSelectionObjects."
        );
      }
    }
  }

  updateCardData(cardList) {
    this.elementList = cardList;
    let tmp = new Map();

    // The cardObj might have changes... this isn't a new list bc of pagination
    // Relevant to update re: Objects are used in comparison table
    // Also used to get type id, but that should not have been edited
    if (this._currentMultiSelection.size > 0) {
      for (let el of cardList) {
        if (this._currentMultiSelection.has(el.card.cardObj.id)) {
          tmp.set(el.card.cardObj.id, el.card.cardObj);
        }
      }
      this._currentSelectionObjects = tmp;
      this._comparisonPanel._refreshTable(this._currentSelectionObjects);
    }
  }

  checkForFilters(filterObj) {
    // This will stay up to date with any filter on the page
    let tmpArray = [];
    for (let filter of filterObj) {
      // console.log(`Filter found: ${filter}`)
      if (
        filter.categoryGroup === "Localization" &&
        !filter.field.startsWith("_")
      ) {
        this.resultsFilter.containsAttributes = true;
        tmpArray.push(filter.field);
        // console.log(filter.field);
      }
    }
    this.resultsFilter.attributes = tmpArray;
    this.resultsFilter.filterObj = filterObj;
    this._editPanel.updateWarningList(this.resultsFilter);
  }

  async _prefetch() {
    await this._page.cardData._bulkCaching(this._page._filterConditions);

    this._page.hideDimmer();
    this._selectionPanel.show(true);
    if (!this._editMode) this.startEditMode();
  }
}
customElements.define("entity-gallery-bulk-edit", GalleryBulkEdit);
