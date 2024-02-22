import { TatorElement } from "./tator-element.js";
import { svgNamespace } from "./tator-element.js";

export class EntityGallerySortSimple extends TatorElement {
  constructor() {
    super();
    const template = document.querySelector("#entity-gallery-sort");
    this._shadow.appendChild(document.importNode(template.content, true));
    this._ascending = this._shadow.getElementById("ascending");
    this._descending = this._shadow.getElementById("descending");
    this._options = this._shadow.getElementById("options");
    this._direction = "ascending";

    this._ascending.addEventListener("click", () => {
      this._ascending.setAttribute("stroke-width", "4");
      this._descending.setAttribute("stroke-width", "2");
      this._direction = "ascending";
      this._emit();
    });

    this._descending.addEventListener("click", () => {
      this._ascending.setAttribute("stroke-width", "2");
      this._descending.setAttribute("stroke-width", "4");
      this._direction = "descending";
      this._emit();
    });

    this._options.addEventListener("change", () => {
      this._emit();
    });
  }

  /**
   * Sets the available dataset that can be selected by the user
   *
   * @param {string} category - One of media, localization, state.
   * @param {array} entityTypes - List of data types for this category.
   */
  init(category, entityTypes) {
    // Remove existing choices
    while (this._options.options.length > 0) {
      this._options.remove(0);
    }

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

    const builtinGroup = document.createElement("optgroup");
    builtinGroup.setAttribute("label", "Built-in Fields");
    this._options.appendChild(builtinGroup);
    for (const fieldChoice of fieldChoices) {
      const option = document.createElement("option");
      option.setAttribute("value", fieldChoice);
      builtinGroup.appendChild(option);
    }
   
    if (geoChoices.length > 0) {
      const geomGroup = document.createElement("optgroup");
      geomGroup.setAttribute("label", "Geometry");
      this._options.appendChild(geomGroup);
      for (const geoChoice of geoChoices) {
        const option = document.createElement("option");
        option.setAttribute("value", geoChoice);
        geomGroup.appendChild(option);
      }
    }

    if (attributeChoices > 0) {
      const attrGroup = document.createElement("optgroup");
      attrGroup.setAttribute("label", "Attributes");
      this._options.appendChild(attrGroup);
      for (const attrChoice of attributeChoices) {
        const option = document.createElement("option");
        option.setAttribute("value", attrChoice);
        attrGroup.appendChild(option);
      }
    }
  }

  _emit() {
    // Dispatch event indicating start/stop.
    this.dispatchEvent(
      new CustomEvent("sortBy", {
        composed: true,
        detail: {
          queryParam: `{this._direction == "ascending" ? "" : "-"}{this._fieldName.getValue()}`,
        },
      })
    );
  }
}

customElements.define("entity-gallery-sort-simple", EntityGallerySortSimple);
