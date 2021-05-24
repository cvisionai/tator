class EntityGalleryPanelForm extends TatorElement {
  constructor() {
    super();

    // @TODO what can be reused for this?
    // this.todo = document.createElement("div");
    // this._shadow.appendChild(this.todo);

    this._div = document.createElement("div");
    this._shadow.appendChild(this._div);

    // This object will have properties of the attributeType IDs
    // Each property will link to the attribute panel itself.
    this._attributeTypes = {};


    // #TODO This is a band-aid. We need to modify attribute-panel to not include
    // specific REST calls or utilize a modified form of the SettingsHelper
    this._attributes = document.createElement("attribute-panel");
    this._attributes.enableBuiltInAttributes = true;
    this._attributes.enableHiddenAttributes = true;
    this._attributes.permission = "View Only"; // start as view only - controlled by lock
    this._div.appendChild(this._attributes);
  }

  static get observedAttributes() {
    return ["permission"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "permission":
        console.log(`Form permission updated from ${oldValue} to ${newValue}`);
        this._attributes.permission = newValue; // start as view only - controlled by lock
        break;
    }
  }

  /**
   * #TODO In the future, we might want to actually display multiple types (e.g. media + loc)
   * @param {object} data - cardData (add more info)
   * @param {Media/Localization} attributePanelData
   */
  _init(data, attributePanelData, associatedMedia) {
    //console.log(data);

    // Hide all of the attribute panels, and then show the one we care about.
    for (const attrTypeId in this._attributeTypes) {
      this._attributeTypes[attrTypeId].style.display = "none";
    }

    // Haven't seen this attribute type yet
    if (!(data.entityType.id in this._attributeTypes)) {
      data.entityType.isTrack = false;
      this._attributes.dataType = data.entityType;
      this._attributes.displaySlider(false);
      this._attributes.displayGoToTrack(false);
      this._attributeTypes[data.entityType.id] = this._attributes;

      this._attributes.addEventListener("change", () => {
        this._values = this._attributes.getValues();

        if (this._values !== null) {
          const detail = {
            detail: {
              id: data.id,
              values: this._values
            }
          };
          console.log(detail);
          this.dispatchEvent(new CustomEvent("save", detail));
        }
      });

    } else {
      this._attributes = this._attributeTypes[data.entityType.id];
    }

    if (associatedMedia) {
      this._attributes.associatedMedia = associatedMedia;
    }

    this._attributes.setValues(attributePanelData);
    this._attributes.style.display = "block";
  }
}

customElements.define("entity-gallery-panel-form", EntityGalleryPanelForm);