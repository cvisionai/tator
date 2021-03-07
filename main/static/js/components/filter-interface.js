/**
 * Filter/search widget
 *
 * Encapsulates the filter query bar and associated modal.
 */
class FilterInterface extends TatorElement {

  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "analysis__filter_interface px-6 py-3 rounded-2");
    this._shadow.appendChild(div);

    /*
    const barLabel = document.createElement("span");
    barLabel.textContent = "Filter Criteria"
    barLabel.setAttribute("class", "f1 text-gray text-semibold");
    div.appendChild(barLabel);
    */

    const filterButton = document.createElement("filter-data-button");
    div.appendChild(filterButton);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "form-control py-3 mr-3 col-12 f2 text-white has-more");
    this._input.setAttribute("autocomplete", "off");
    this._input.setAttribute("type", "text");
    this._input.setAttribute("id", "filter-data");
    this._input.setAttribute("name", "q");
    barDiv.appendChild(this._input);

    this._filterString = document.createElement("div");
    this._filterString.setAttribute("class", "analysis__filter_string");
    this._filterString.style.marginLeft = "10px";
    div.appendChild(this._filterString);

    this._filterStringDiv = document.createElement("div");
    this._filterStringDiv.setAttribute("class", "px-2 py-2");
    this._filterString.appendChild(this._filterStringDiv);

    // Main filter dialog the user will interact with to set the data filter
    this._filterDialog = document.createElement("filter-dialog");

    // Click handler to pop open the corresponding dialog window
    filterButton.addEventListener("click", () => {
      this._filterDialog.setAttribute("is-open", "");
      this.dispatchEvent(new Event("openedFilterDialog"));
    });

    // Respond to user hitting apply in the filter dialog. Update the data filter
    // and remove the modal
    this._filterDialog.addEventListener("newFilterSet", () => {

      // Create the filter parmaeters to display in the filter bar
      this.setFilterBar();

      // Close up the dialog
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
   * Sets the data interface that the submodules will use
   *
   * @param {FilterData} val - Data interface object specific for the filtering operations
   */
  set dataView(val) {
    this._dataView = val;

    // With the data view connected, query the data and setup the UI based
    // on the available types
    this._filterDialog.data = this._dataView.getAllTypes();

    // Now that the UI has been setup, check the URL for settings info (if there are any)
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
   * Sets the information displayed in the filter bar based on the
   */
  setFilterBar() {

    // Remove all the children (if there are any)
    while (this._filterStringDiv.firstChild) {
      this._filterStringDiv.removeChild(this._filterStringDiv.firstChild);
    }

    // Loop through all the conditions and create the string
    var conditions = this._filterDialog.getConditions();
    for (const [index, condition] of conditions.entries()) {

      var elem = document.createElement("span");
      elem.setAttribute("class", "text-gray px-1");
      elem.textContent = condition.getString();
      this._filterStringDiv.appendChild(elem);

      if (index != conditions.length - 1) {
        var elem = document.createElement("span");
        elem.setAttribute("class", "text-purple px-1");
        elem.textContent = "AND";
        this._filterStringDiv.appendChild(elem);
      }
    }
  }

}

customElements.define("filter-interface", FilterInterface);
