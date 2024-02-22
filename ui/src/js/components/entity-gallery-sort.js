import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class EntityGallerySortSimple extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center text-gray f3");
    this._shadow.appendChild(div);

    this._fieldName = document.createElement("enum-input");
    this._fieldName.setAttribute("class", "col-4");
    this._fieldName.setAttribute("name", "Sort By: ");
    this._fieldName.style.marginLeft = "15px";
    this._fieldName.permission = "View Only";
    this._fieldName.label.setAttribute("class", "d-flex flex-items-center py-1");
    div.appendChild(this._fieldName);

    this._direction = document.createElement("bool-input");
    this._direction.setAttribute("off-text", "Asc");
    this._direction.setAttribute("on-text", "Desc");
    div.appendChild(this._direction);
    
    this._fieldName.addEventListener(
      "change",
      this._emit.bind(this)
    );

    this._direction.addEventListener(
      "change",
      this._emit.bind(this)
    );

  }

  /**
   * Sets the available dataset that can be selected by the user
   *
   * @param {string} category - One of media, localization, state.
   * @param {array} entityTypes - List of data types for this category.
   */
  init(category, entityTypes) {
    // Remove existing choices
    this._fieldName.clear();

    // Create the menu options for the field name
    var fieldChoices = [];
    var geoChoices = [];
    var attributeChoices = [];
    var uniqueFieldChoices = [];
    this._currentTypes = [];

    for (const attributeType of entityTypes) {
      for (const attribute of attributeType.attribute_types) {
        if (uniqueFieldChoices.indexOf(attribute.name) < 0) {
          if (attribute.label) {
            if (
              ["_x", "_y", "_width", "_height"].indexOf(attribute.name) >= 0
            ) {
              geoChoices.push({
                value: attribute.name,
                label: attribute.label,
              });
            } else {
              fieldChoices.push({
                value: attribute.name,
                label: attribute.label,
              });
            }
          } else {
            attributeChoices.push({
              value: attribute.name,
              label: attribute.name,
            });
          }
          uniqueFieldChoices.push(attribute.name);
        }
      }
      this._currentTypes.push(attributeType);
    }

    fieldChoices.sort((a, b) => {
      return a.label.localeCompare(b.label);
    });
    attributeChoices.sort((a, b) => {
      return a.label.localeCompare(b.label);
    });

    this._fieldName.choices = {
      "Built-in Fields": fieldChoices,
      Geometry: geoChoices,
      Attributes: attributeChoices,
    };
    this._fieldName.permission = "Can Edit";
    this._fieldName.selectedIndex = -1;
    this._emit();
  }

  _emit() {
    // Dispatch event indicating start/stop.
    this.dispatchEvent(
      new CustomEvent("sortBy", {
        composed: true,
        detail: {
          queryParam: `{this._direction == "ascending" ? "" : "-"}{this._fieldName.getValue()}` ,
        },
      })
    );
  }
}

customElements.define("entity-gallery-sort-simple", EntityGallerySortSimple);
