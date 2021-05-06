class EntityFormForPanel extends TatorElement {
  constructor() {
    super();

    // @TODO what can be reused for this?
    this.todo = document.createElement("div");
    this._shadow.appendChild(this.todo);

    this.inputHelper = new SettingsInput();

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
  _init(data){
    /*
    this.form = document.createElement("form");

    // @TODO this is specific to the data for /analysis/annotations.js
    for(const [attr, value] of Object.entries(obj.attributes)){
      // Attribute name and it's value
      const NAME = "Name";
      const nameInput = this.inputHelper.inputText({
        "labelText" : attr,
        "name" : attr,
        "value" : value
      });
      nameInput.querySelector("input").disabled = true;
      nameInput.querySelector("input").classList.add("disabled");
      this.form.appendChild( nameInput );
    }

      // View Media Button
      //class="btn btn-clear btn-charcoal text-gray"
      const viewMedia = document.createElement("a");

      viewMedia.setAttribute("value", "View Media");
      viewMedia.setAttribute("class", `col-12 btn btn-clear btn-charcoal text-gray text-semibold`);
      viewMedia.appendChild( document.createTextNode("View Media") );
      viewMedia.setAttribute("href", obj.mediaLink);
      this.form.appendChild(viewMedia);

      // Append form to el
      this._shadow.appendChild(this.form)
      */

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
      attributes.permission = "View Only";
    }
    else {
      attributes = this._attributeTypes[data.entityType.id];
    }

    attributes.setValues(data);
    attributes.style.display = "block";
  }
}

customElements.define("entity-form-for-panel", EntityFormForPanel);