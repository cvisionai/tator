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
    var attributeChoices = [];
    var uniqueFieldChoices = [];

    fieldChoices = [
      {value: "$id", label: "ID"},
      {value: "$section", label: "Section ID"},
      {value: "$created_datetime", label: "Created datetime"},
      {value: "$created_by", label: "Created by (user ID)"},
      {value: "$modified_datetime", label: "Modified datetime"},
      {value: "$modified_by", label: "Modified by (user ID)"},
    ];
    if (category == "Media") {
      fieldChoices = fieldChoices.concat([
        {value: "$name", label: "Name"},
        {value: "$fps", label: "Frame rate (fps)"},
        {value: "$archive_state", label: "Archive state"},
      ]);
    }

    for (const entityType of entityTypes) {
      for (const attributeType of entityType.attribute_types) {
        if (uniqueFieldChoices.indexOf(attributeType.name) < 0) {
          attributeChoices.push({
            value: attributeType.name,
            label: attributeType.name,
          });
          uniqueFieldChoices.push(attributeType.name);
        }
      }
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
      option.setAttribute("value", fieldChoice.value);
      option.setAttribute("label", fieldChoice.label);
      builtinGroup.appendChild(option);
    }
   
    if (attributeChoices.length > 0) {
      const attrGroup = document.createElement("optgroup");
      attrGroup.setAttribute("label", "Attributes");
      this._options.appendChild(attrGroup);
      for (const attrChoice of attributeChoices) {
        const option = document.createElement("option");
        option.setAttribute("value", attrChoice.value);
        option.setAttribute("label", attrChoice.label);
        attrGroup.appendChild(option);
      }
    }

    if (category == "Media") {
      this._options.value = "$name";
    } else {
      this._options.value = "$id";
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
