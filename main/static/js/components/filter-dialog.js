/**
 * Element used to encapsulate the filter modal dialog.
 */
class FilterDialog extends ModalDialog {

  constructor()
  {
    super();

    this._title.nodeValue = "Filter Data";

    //
    // Buttons
    //

    const apply = document.createElement("button");
    apply.setAttribute("class", "btn btn-clear");
    apply.textContent = "Apply Filters";
    this._footer.appendChild(apply);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    // Handler when user hits the apply button.
    apply.addEventListener("click", () => {
      var filterString = ""; // #TODO

      this.dispatchEvent(new CustomEvent("applyFilterString", {
        detail: {
          filterString: filterString
        },
        composed: true,
      }));
    });

    this._data = null;
    this._attributeTypes = [];

    // Handler when user hits the cancel button.
    cancel.addEventListener("click", () => {
      this.dispatchEvent(new Event("close"));
    });
  }

  /**
   * Sets the data interface that the submodules will use
   * Expected to only be set once
   *
   * @param {array} val - List of objects with the following fields
   *   .name - str - Name of attribute type
   *   .attributes - array - Array of objects with the following fields
   *     .name - str - Name of attribute
   *     .dtype - str - string|bool|float|int|datetime|geopos|enum
   *     .choices - array - Valid only if enum was provided
   */
  set data(val)
  {
    if (this._data != null)
    {
      console.warn("filter-dialog already binded with a dataset");
    }

    this._data = val;

    // Set the GUI elements
    for (const dataTypeData of this._data)
    {
      var elem = document.createElement("filter-attribute-type");
      elem.data = dataTypeData;
      this._main.appendChild(elem);
      this._attributeTypes.push(elem);
    }

    // Parse the URL then for settings information
    // #TODO
  }

  /**
   * Sets the filter dialog UI based on the given filter string
   * @param {string} filterString
   */
  setFilters(filterString)
  {
    // #TODO
  }
}

customElements.define("filter-dialog", FilterDialog);