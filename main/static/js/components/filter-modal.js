/**
 * Element used to encapsulate the filter modal dialog.
 *
 */
class FilterModal extends TatorElement {

  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "annotation__panel--popup annotation__panel px-4 rounded-2");
    this._div.style.zIndex = 3;
    this._shadow.appendChild(this._div);

    const buttons = document.createElement("div");
    buttons.setAttribute("class", "d-flex flex-items-center py-4");
    this._div.appendChild(buttons);

    const apply = document.createElement("button");
    apply.setAttribute("class", "btn btn-clear");
    apply.textContent = "Apply Filters";
    buttons.appendChild(apply);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn-clear px-4 text-gray hover-text-white");
    cancel.textContent = "Cancel";
    buttons.appendChild(cancel);

    apply.addEventListener("click", () => {
      var filterString = ""; // #TODO

      this.dispatchEvent(new CustomEvent("applyFilterString", {
        detail: {
          filterString: filterString
        },
        composed: true,
      }));
    });

    cancel.addEventListener("click", () => {
      this.dispatchEvent(new Event("cancel"));
    });
  }

  /**
   * Sets the data interface that the submodules will use
   * 
   * @param {array} val - List of objects with the following fields
   *   .name - str - Name of attribute type
   *   .attributes - array - Array of objects with the following fields
   *     .name - str - Name of attribute
   *     .dtype - str - string|bool|float|int|datetime|geopos|enum
   *     .choices - array - Valid only if enum was provided 
   */
  set data(val) {
    this._data = val;

    // This needs to set the GUI elements

    // This should also parse the URL then for settings information
  }
}

customElements.define("filter-modal", FilterModal);