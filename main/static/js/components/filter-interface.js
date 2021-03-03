/**
 * Filter/search widget
 *
 * This encapsulates the filter query bar and the modal/associated button.
 */
class FilterInterface extends TatorElement {

  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "analysis__search_wrapper d-flex");
    this._shadow.appendChild(div);

    const filterButton = document.createElement("button");
    filterButton.setAttribute("class", "btn btn-clear");
    filterButton.textContent = "Filter Data";
    div.appendChild(filterButton);

    const barDiv = document.createElement("div");
    barDiv.setAttribute("class", "analysis__search d-flex");
    div.appendChild(barDiv);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "py-3 px-3 col-12 f2 text-white has-more");
    this._input.setAttribute("autocomplete", "off");
    this._input.setAttribute("type", "search");
    this._input.setAttribute("id", "filter-data");
    this._input.setAttribute("name", "q");
    barDiv.appendChild(this._input);

    // Main filter dialog the user will interact with to set the data filter
    this._filterDialog = document.createElement("filter-dialog");

    // Click handler to pop open the corresponding dialog window
    filterButton.addEventListener("click", () => {
      this._filterDialog.setAttribute("is-open", "");
      this.dispatchEvent(new Event("openedFilterDialog"));
    });

    // Respond to user hitting apply in the filter dialog. Update the data filter
    // and remove the modal
    this._filterDialog.addEventListener("applyFilterString", () => {
      this._filterDialog.removeAttribute("is-open");
      this.dispatchEvent(new Event("closedFilterDialog"));
    });

    // Respond to user hitting close in the filter dialog. Don't update the data filter
    // but remove the modal
    this._filterDialog.addEventListener("close", () => {
      this._filterDialog.removeAttribute("is-open");
      this.dispatchEvent(new Event("closedFilterDialog"));
    });

  }

  /**
   * Sets the parent element that the filter dialog will be added to.
   * This needs to be set prior to the user clicking on the filter button
   *
   * @param {div} parent - Parent div that the dialog will be a child of.
   *                       This allows the dialog window to pop up with the has-open-modal
   *                       class attribute enabled.
   */
  setDialogParent(parent) {
    parent.appendChild(this._filterDialog);
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
  set dataView(val) {
    this._dataView = val;

    // With the data view connected, query the data and setup the UI based
    // on the available types
    this._filterDialog.data = this._dataView.getAllTypes();

    // Now that the UI has been setup, check the URL for settings info (if there are any)
  }
}

customElements.define("filter-interface", FilterInterface);
