import { TatorElement } from "../tator-element.js";

export class EntityGalleryPanelForm extends TatorElement {
  constructor() {
    super();

    // @TODO what can be reused for this?
    // this.todo = document.createElement("div");
    // this._shadow.appendChild(this.todo);

    this._div = document.createElement("div");
    this._shadow.appendChild(this._div);

    // #TODO This is a band-aid. We need to modify attribute-panel to not include
    // specific REST calls or utilize a modified form of the SettingsHelper
    this._attributes = document.createElement("attribute-panel");
    this._attributes.enableBuiltInAttributes = true;
    this._attributes.enableHiddenAttributes = true;
    this._attributes.permission = "View Only"; // start as view only - set to user permission on page
    this._div.appendChild(this._attributes);

    this._attributes.addEventListener("change", this._emitChangedData.bind(this));

    this._lowerDiv = document.createElement("div");
    this._lowerDiv.setAttribute("class", "border-top py-3");
    this._lowerDiv.hidden = true;
    this._div.appendChild(this._lowerDiv);

    this._removeEntity = document.createElement("delete-button");
    this._lowerDiv.appendChild(this._removeEntity);

    this._modalNotify = document.createElement("modal-notify");
    this._shadow.appendChild(this._modalNotify);

    this._removeEntity.addEventListener("click", this._removeCallback.bind(this));  
  }

  static get observedAttributes() {
    return ["permission"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "permission":
        this._attributes.permission = newValue;
        if (newValue == "View Only") {
          this._lowerDiv.hidden = false;
        }
        break;
    }
  }

  /**
   * #TODO In the future, we might want to actually display multiple types (e.g. media + loc)
   * @param {object} data - cardData (add more info)
   * @param {Media/Localization} attributePanelData
   */
  _init({ data, attributePanelData, associatedMedia, allowDelete = false }) {
    if (data.entityType) data.entityType.isTrack = false;
    this._attributes.dataType = data.entityType;
    this._attributes.displaySlider(false);
    this._attributes.displayGoToTrack(false);
    this._attributes.displayGoToLocalization(false);

    if (associatedMedia) {
      this._attributes.associatedMedia = associatedMedia;
    }

    this._data = data;

    if (allowDelete) {
      this._removeEntity.init(`Delete ${this._data.entityType.name} ID: ${this._data.id}`, "text-red");
      this._lowerDiv.hidden = false;
    }


    if (attributePanelData.attributes !== null) {
      this._attributes.setValues(attributePanelData);
      this._attributes.style.display = "block";
    } else {
      console.warn("Missing attributes.", attributePanelData);
    }
  }

  _emitChangedData() {
    var values = this._attributes.getValues();
    if (values !== null) {
      const detail = {
        detail: {
          id: this._data.id,
          values: values
        }
      };
      this.dispatchEvent(new CustomEvent("save", detail));
    }
  }

  updateValues({ newValues }) {
    this._attributes.setValues(newValues);
  }

  setValues(data) {
    this._attributes.setValues(data);
  }

  _removeCallback() {
    // Make a popup and confirm deletion.....
    console.log("REMOVE....");
    console.log(this._data);
    this._modalNotify.init("Confirm remove", `Are you sure you want to delete ${this._data.entityType.name}?`, "error", "confirm", false);
    this._modalNotify.setAttribute("isopen", "");

    this._modalNotify._accept.addEventListener("click", () => {
      this._modalNotify.closeCallback();
      console.log("OL!");
      fetch(`/rest/Localization/${this._data.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      })
        .then(response => { return response.json(); })
        .then(result => {
          this._modalNotify.setAttribute("is-open", "true");
          this._modalNotify.init("Success!", `${result}`, "ok", "ok", false)
        }).catch(err => {
          console.error("Error deleting localization entity.", err);
        });
    });
  }

}

customElements.define("entity-panel-form", EntityGalleryPanelForm);
