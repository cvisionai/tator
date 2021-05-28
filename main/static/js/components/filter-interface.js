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

    this._filterString = document.createElement("div");
    this._filterString.setAttribute("class", "analysis__filter_string");
    this._filterString.style.marginLeft = "10px";
    div.appendChild(this._filterString);

    this._filterStringDiv = document.createElement("div");
    this._filterStringDiv.setAttribute("class", "px-2 py-2");
    this._filterString.appendChild(this._filterStringDiv);

    this._algoButton = document.createElement("algorithm-button");
    this._algoButton.hideNewAlgorithm();
    div.appendChild(this._algoButton);

    this._confirmRunAlgorithm = document.createElement("confirm-run-algorithm");
    div.appendChild(this._confirmRunAlgorithm);

    this._modalNotify = document.createElement("modal-notify");
    div.appendChild(this._modalNotify);

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

      // Make the GUI updates and dispatch an event denoting there's a new filter to apply
      this.applyFilterData();

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

    // Respond to user requesting to run an algorithm
    this._algoButton.addEventListener("runAlgorithm", this._openConfirmRunAlgoModal.bind(this));
    this._confirmRunAlgorithm.addEventListener("close", this._closeConfirmRunAlgoModal.bind(this));
  }

  _notify(title, message, error_or_ok) {
    this._modalNotify.init(title, message, error_or_ok);
    this._modalNotify.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }

  /**
   * Callback when user clicks on an algorithm button.
   * This launches the confirm run algorithm modal window.
   */
   _openConfirmRunAlgoModal(evt) {

    this._confirmRunAlgorithm.init(evt.detail.algorithmName, evt.detail.projectId, null, null, []);
    this._confirmRunAlgorithm.setAttribute("is-open","");
    this.setAttribute("has-open-modal", "");
    document.body.classList.add("shortcuts-disabled");
  }

  /**
   * Callback from confirm run algorithm modal choice
   */
  _closeConfirmRunAlgoModal(evt) {

    this._confirmRunAlgorithm.removeAttribute("is-open");
    this.removeAttribute("has-open-modal");
    document.body.classList.remove("shortcuts-disabled");

    var that = this;
    if (evt.detail.confirm) {
      this._dataView.launchAlgorithm(evt.detail.algorithmName, evt.detail.extraParameters).then(launched => {
        if (launched) {
          that._notify("Algorithm launched!",
                       `Successfully launched ${evt.detail.algorithmName}!`,
                       "ok");
        }
        else {
          that._notify("Error launching algorithm!",
                      `Failed to launch ${evt.detail.algorithmName}`,
                      "error");
        }
      });
    }
  }

  /**
   * Applies the filter conditions based on the dialog, updates the GUI appropriately and
   * dispatches the filterParameters event
   */
  applyFilterData() {

      // Create the filter parmaeters to display in the filter bar
      this.setFilterBar();

      // Send out an event to anyone listening that there's a new filter applied
      this.dispatchEvent(new CustomEvent("filterParameters", {
        composed: true,
        detail: {
          conditions: this._filterDialog.getConditions()
        }
      }));
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

    // Get the algorithm information. If there are no registered algorithms, disable the button
    this._algoButton.setAttribute("project-id", this._dataView.getProjectId());
    this._algoButton.algorithms = this._dataView.getAlgorithms();
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

  /**
   * Applies the filter string to the filter dialog and then performs applyFilterData
   * @param {array} val - List of FilterConditionData objects
   */
  setFilterConditions(val) {
    this._filterDialog.setConditions(val);
    this.setFilterBar();
  }
}

customElements.define("filter-interface", FilterInterface);
