/**
 * Filter/search widget
 *
 * Encapsulates the filter query bar and associated modal.
 */
class FilterInterface extends TatorElement {

  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex");
    this._shadow.appendChild(div);

    const barDiv = document.createElement("div");
    barDiv.setAttribute("class", "analysis__search d-flex");
    div.appendChild(barDiv);

    this._filterString = document.createElement("input");
    this._filterString.setAttribute("class", "form-control py-3 mr-3 col-12 f2 text-white has-more");
    barDiv.appendChild(this._filterString);

    const filterButton = document.createElement("button");
    filterButton.setAttribute("class", "btn btn-clear");
    filterButton.textContent = "Filter Data";
    barDiv.appendChild(filterButton);

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
    // Loop through all the conditions and create the string
    var filterString = "";
    var conditions = this._filterDialog.getConditions();
    for (const [index, condition] of conditions.entries()) {
      filterString += condition.getString();
      if (index != conditions.length - 1) {
        filterString += " AND ";
      }
    }
    this._filterString.value = filterString;
  }

}

customElements.define("filter-interface", FilterInterface);
