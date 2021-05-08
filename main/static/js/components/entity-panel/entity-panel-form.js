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
  }

  /**
   * #TODO In the future, we might want to actually display multiple types (e.g. media + loc)
   * @param {object} data - cardData (add more info)
   */
  _init(data) {
    console.log(data);

    // Hide all of the attribute panels, and then show the one we care about.
    for (const attrTypeId in this._attributeTypes) {
      this._attributeTypes[attrTypeId].style.display = "none";
    }

    // Haven't seen this attribute type yet
    var attributes;
    if (!(data.entityType.id in this._attributeTypes)) {

      // #TODO This is a band-aid. We need to modify attribute-panel to not include
      // specific REST calls or utilize a modified form of the SettingsHelper
      attributes = document.createElement("attribute-panel");
      this._div.appendChild(attributes);

      data.entityType.isTrack = false;
      attributes.dataType = data.entityType;
      attributes.displaySlider(false);
      attributes.displayGoToTrack(false);
      this._attributeTypes[data.entityType.id] = attributes;
      //attributes.permission = "View Only";

      attributes.addEventListener("change", () => {
        this._values = attributes.getValues();

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
      attributes = this._attributeTypes[data.entityType.id];
    }

    attributes.setValues(data);
    attributes.style.display = "block";
  }
}

customElements.define("entity-gallery-panel-form", EntityGalleryPanelForm);