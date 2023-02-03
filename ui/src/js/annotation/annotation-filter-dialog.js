import { FilterData } from "../components/filter-data.js";
import { ModalDialog } from "../components/modal-dialog.js";
import { FilterConditionData } from "../util/filter-utilities.js";
import { TatorData } from "../util/tator-data.js";

/// Class to fake out not needing to load a full up tator-data object and use what is in
/// annotation-data. Basically convert a annotation-data to a tator-data for filter-data
class FakeModelData
{
  constructor(projectId, data)
  {
    this._projectId = projectId;
    this._stateTypeAssociations = {media: [], frame: [], localization: []};
    this._localizationTypes = [];
    for (const dataType of data._dataTypesRaw) {
      if (dataType.dtype == "state")
      {
        if (dataType.association == "Media") {
          this._stateTypeAssociations.media.push(dataType);
        }
        else if (dataType.association == "Localization") {
          this._stateTypeAssociations.localization.push(dataType);
        }
        else if (dataType.association == "Frame") {
          this._stateTypeAssociations.frame.push(dataType);
        }
      }
      else 
      {
        this._localizationTypes.push(dataType);
      }
    }

    this._memberships = data._memberships;
    this._versions = data._versions;
  }

  getStoredMediaStateTypes()
  {
    return this._stateTypeAssociations.media;
  }

  getStoredLocalizationStateTypes()
  {
    return this._stateTypeAssociations.localization;
  }

  getStoredLocalizationTypes()
  {
    return this._localizationTypes;
  }

  getStoredMediaTypes()
  {
    return [];
  }

  getStoredVersions()
  {
    return this._versions;
  }
  getStoredSections()
  {
    return [];
  }
  getStoredMemberships()
  {
    return this._memberships;
  }
  getStoredAlgorithms()
  {
    return [];
  }
  getProjectId()
  {
    return this._projectId;
  }
  launchAlgorithm()
  {
    // No implement 
  }
}

/**
 * Element used to encapsulate the filter modal dialog.
 */
export class AnnotationFilterDialog extends ModalDialog {

  constructor()
  {
    super();

    this._div.setAttribute("class", "modal-wrap modal-extra-wide d-flex");
    this._modal.setAttribute("class", "modal py-6 px-6 rounded-2");
    this._header.setAttribute("class", "px-3 py-3");
    this._titleDiv.setAttribute("class", "h2");
    this._title.nodeValue = "Apply a data filter";
    this._titleDiv.style.marginBottom = "10px";
    this._main.remove();

    this._conditionsDiv = document.createElement("div");
    this._conditionsDiv.setAttribute("class", "analysis__filter_conditions_list");
    this._header.appendChild(this._conditionsDiv);

    const apply = document.createElement("button");
    apply.setAttribute("class", "btn btn-clear");
    apply.textContent = "Apply Filter";
    this._footer.appendChild(apply);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    this._data = null;

    /**
     * Event handlers
     */

    // Handler when user hits the apply button.
    apply.addEventListener("click", () => {
      /// @TODO _convertFilterForTator in TatorData fed into annotation-data somehow.
      var searchObject = {'method': 'and', 'operations': []};
      let clear = true;
      for (let condition of this._filterConditionGroup.getConditions())
      {
        searchObject.operations.push(this._td._convertFilterForTator(condition));
        clear = false;
      }
      if (clear == false)
      {
        console.info(`Constructed search object = ${JSON.stringify(searchObject)}`);
        this.dispatchEvent(new CustomEvent("annotationFilter", {detail: {filterObject: searchObject}}));
      }
      if (clear == true)
      {
        this.dispatchEvent(new CustomEvent("annotationFilter", {detail: {filterObject: null}}));
      }
    });

    // Handler when user hits the cancel button.
    cancel.addEventListener("click", () => {
      this.dispatchEvent(new Event("close"));
    });
  }


  /**
   * Sets the available dataset that can be selected by the user
   *
   * @param {int} project to load
   */
  set project(project)
  {
    if (this._project != null)
    {
      console.warn("filter-dialog already bound with a dataset");
    }
    // @TODO It'd be great to be able to use 'annotation-data' directly in Filter data
    //       or rewire entity browser to use tator-data.
    
  }

  set data(data)
  {
    this._td = new FakeModelData(data.project, data);
    this._filterData = new FilterData(this._td, [], ['Medias']);
    this._filterData.init();

    // Set the GUI elements
    this._filterConditionGroup = document.createElement("filter-condition-group");
    this._filterConditionGroup.data = this._filterData.getAllTypes();
    this._filterConditionGroup._div.style.marginTop = "10px";
    this._conditionsDiv.appendChild(this._filterConditionGroup);
  }

  /**
   * @returns {array} - Array of condition objects requested by the user.
   */
  getConditions() {
    return this._filterConditionGroup.getConditions();
  }

  /**
   * Sets the conditions based on the provided info
   * @param {array} val - List of FilterConditionData objects
   */
  setConditions(val) {
    this._filterConditionGroup.setConditions(val);
  }
}

customElements.define("annotation-filter-dialog", AnnotationFilterDialog);