import { TatorElement } from "./tator-element.js";
import { FilterConditionData } from "../util/filter-utilities.js";
import { AlgorithmButton } from "../project-detail/algorithm-button.js";

/**
 * Filter/search widget
 */
export class FilterInterface extends TatorElement {

  constructor() {
    super();

    var outerDiv = document.createElement("div");
    outerDiv.setAttribute("class", "analysis__filter_interface px-1 py-1 rounded-2");
    this._shadow.appendChild(outerDiv);

    /**
     * Main button area
     */
    this._topNav = document.createElement("div");
    this._topNav.setAttribute("class", "analysis__filter_main");
    outerDiv.appendChild(this._topNav);

    this._filterNavDiv = document.createElement("div");
    this._filterNavDiv.setAttribute("class", "analysis__filter_nav");
    this._filterNavDiv.style.paddingRight = "16px";
    this._topNav.appendChild(this._filterNavDiv);

    const filterButton = document.createElement("filter-data-button");
    this._filterNavDiv.appendChild(filterButton);

    this._algoButton = document.createElement("algorithm-button");
    this._filterNavDiv.appendChild(this._algoButton);

    /**
     * Filter condition interface
     */

    this._filterListDiv = document.createElement("div");
    this._filterListDiv.setAttribute("class", "analysis__filter_conditions_interface px-3 py-3");
    this._filterListDiv.hidden = true;
    outerDiv.appendChild(this._filterListDiv);

    this._conditionsDiv = document.createElement("div");
    this._conditionsDiv.setAttribute("class", "analysis__filter_conditions_list");
    this._filterListDiv.appendChild(this._conditionsDiv);

    var footerDiv = document.createElement("div");
    footerDiv.setAttribute("class", "modal__footer d-flex mt-6");
    this._filterListDiv.appendChild(footerDiv);

    const apply = document.createElement("button");
    apply.setAttribute("class", "btn btn-clear f2");
    apply.textContent = "Search";
    apply.style.height = "32px";
    footerDiv.appendChild(apply);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal f2");
    cancel.style.height = "32px";
    cancel.textContent = "Cancel";
    footerDiv.appendChild(cancel);



    /**
     * Filter condition pill boxes
     */
    this._filterStringDiv = document.createElement("div");
    this._filterStringDiv.setAttribute("class", "analysis__filter_string col-10");
    this._filterStringDiv.style.paddingLeft = "16px";
    this._topNav.appendChild(this._filterStringDiv);

    /**
      * Other:
      * - optional more menu
      * - confirm run algo
      * - modal notify
    */
    this._moreNavDiv = document.createElement("div");
    this._moreNavDiv.setAttribute("class", "analysis__more_nav px-1");
    this._topNav.appendChild(this._moreNavDiv);

    this._confirmRunAlgorithm = document.createElement("confirm-run-algorithm");
    this._shadow.appendChild(this._confirmRunAlgorithm);

    this._modalNotify = document.createElement("modal-notify");
    this._shadow.appendChild(this._modalNotify);

    /**
      * Event listeners
    */
    filterButton.addEventListener("click", () => {
      this._filterListDiv.style.display = "block";
      this._filterNavDiv.style.display = "none";
      this._filterStringDiv.style.display = "none";
      this._moreNavDiv.style.display = "none";
    });

    apply.addEventListener("click", () => {
      this.applyFilterData();
      this._filterListDiv.style.display = "none";
      this._filterNavDiv.style.display = "flex";
      this._filterStringDiv.style.display = "flex";
      this._moreNavDiv.style.display = "block";
    });

    cancel.addEventListener("click", () => {
      this._filterListDiv.style.display = "none";
      this._filterNavDiv.style.display = "flex";
      this._filterStringDiv.style.display = "flex";
      this._moreNavDiv.style.display = "block";
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

    var extraParameters = [
      {
        name: "encoded_filters",
        value: encodeURIComponent(encodeURIComponent(JSON.stringify(this._filterConditionGroup.getConditions()))),
      }
    ]
    console.log(extraParameters);
    this._confirmRunAlgorithm.init(evt.detail.algorithmName, evt.detail.projectId, [], null, extraParameters);
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
        conditions: this._filterConditionGroup.getConditions()
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

    // Set the GUI elements
    this._filterConditionGroup = document.createElement("filter-condition-group");
    this._filterConditionGroup.data = this._dataView.getAllTypes();
    this._filterConditionGroup._div.style.marginTop = "10px";
    this._conditionsDiv.appendChild(this._filterConditionGroup);

    // Get the algorithm information. If there are no registered algorithms, disable the button
    this._algoButton.setAttribute("project-id", this._dataView.getProjectId());
    this._algoButton.algorithms = this._dataView.getAlgorithms();
    this._algoButton.hideNewAlgorithm();
  }

  /**
   * Sets the information displayed in the filter bar based on the
   */
  setFilterBar(sectionBasedOnly) {
    // Remove all the children (if there are any)
    while (this._filterStringDiv.firstChild) {
      this._filterStringDiv.removeChild(this._filterStringDiv.firstChild);
    }

    if (this._section)
    {
      this._addBreadcrumbsForSearches(this._section);
      if (sectionBasedOnly) {
        return;
      }
    }

    // Loop through all the conditions and create the string
    var conditions = this._filterConditionGroup.getConditions();

    for (const [index, condition] of conditions.entries()) {
      const pill = document.createElement("removable-pill");
      this._filterStringDiv.appendChild(pill);

      pill.setAttribute("class", "py-1 d-flex");
      pill.style.marginRight = "5px";
      pill.init(condition.getString(), 0);
      pill.addEventListener("removeId", evt => {
        conditions.splice(index, 1);
        this._filterConditionGroup.setConditions(conditions);
        this.applyFilterData();
      });
    }
  }

  _operationToString(filter)
  {
    const operator_convert = {
      'eq': '==',
      'gt' : '>',
      'gte' : '>=',
      'lt' : '<',
      'lte': '<=',
      'date_eq': '==',
      'date_gte': 'After (Inclusive)',
      'date_gt' : 'After',
      'date_lt' : 'Before',
      'date_lte' : 'Before (Inclusive)',
      'date_range' : 'Within',
      'distance_lte' : 'Within'
    }
    const humanReadable = operator_convert[filter.operation];
    const display = (humanReadable ? humanReadable : filter.operation);
    return `${filter.attribute} ${display} ${filter.value}`;
  }

  _addConstantPill(section, description)
  {
    const pill = document.createElement("removable-pill");
    this._filterStringDiv.appendChild(pill);
    pill.setAttribute("class", "py-1 d-flex");
    pill.style.marginRight = "5px";
    pill.init(description, 0);
    pill.removable = false;
    pill.setAttribute("tooltip", `Defined search in section '${section.name}'`);
  }

  set sections(sections)
  {
    this._sections = sections;
  }

  set section(section)
  {
    this._section = section;
    this.setFilterBar(true);
  }

  _addBreadcrumbsForSearches(section) {
    if (section.object_search)
    {
      let ops = [];
      if (section.tator_user_sections)
      {
        for (const s of this._sections)
        {
          // The UUID is the same for the saved search and original section, so only display
          // the name of the matching UUID for the original section name.
          if (s.tator_user_sections == section.tator_user_sections && s.id != section.id)
          {
            ops.push({"attribute": "Section", "operation": "eq","value": s.name});
          }
        }
      }
      if (Object.hasOwn(section.object_search, 'attribute'))
      {
        ops.push(section.object_search);
      }
      else
      {
        ops.push(...section.object_search.operations);
      }
      for (const filter of ops)
      {
        this._addConstantPill(section, "Media:"+this._operationToString(filter));
      }
    }
    if (section.related_object_search)
    {
      let ops = [];
      if (Object.hasOwn(section.related_object_search, 'attribute'))
      {
        ops.push(section.related_object_search);
      }
      else
      {
        ops.push(...section.related_object_search.operations);
      }
      for (const filter of ops)
      {
        this._addConstantPill(section, "Metadata:"+this._operationToString(filter));
      }
    }
  }

  addCachedPill(condition) {
    // just add it once
    this._useCachedResults = condition.value;
  }

  /**
   * Applies the filter string to the filter dialog and then performs applyFilterData
   * @param {array} val - List of FilterConditionData objects
   */
  setFilterConditions(val) {
    this._filterConditionGroup.setConditions(val);
    this.setFilterBar();
  }
}

customElements.define("filter-interface", FilterInterface);
