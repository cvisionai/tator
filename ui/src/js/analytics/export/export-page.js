import { TatorElement } from "../../components/tator-element.js";
import { svgNamespace } from "../../components/tator-element.js";
import { TatorPage } from "../../components/tator-page.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { store } from "./store.js";

class FilterData {
  /**
   * @param {Utilities} tatorData
   * @param {array} includeTypesList
   *    List of types to include from creating filter options for
   *    Available options: "Media"|"Localizations"|"MediaStates"|"LocalizationStates"|"FrameStates"
   */
  constructor(tatorData, includeTypesList) {
    this._frameStateTypes = tatorData.getStoredFrameStateTypes();
    this._mediaStateTypes = tatorData.getStoredMediaStateTypes();
    this._localizationStateTypes = tatorData.getStoredLocalizationStateTypes();
    this._localizationTypes = tatorData.getStoredLocalizationTypes();
    this._mediaTypes = tatorData.getStoredMediaTypes();
    this._versions = tatorData.getStoredVersions();
    this._sections = tatorData.getStoredSections();
    this._memberships = tatorData.getStoredMemberships();
    this._includeTypesList = includeTypesList;
    this._allTypes = [];

    this.createOptionsLists();
    this.createEntityTypeList();
  }

  /**
   * Create list of options for the enum-type dropdowns
   */
  createOptionsLists() {
    function sortList(list) {
      list.sort((a, b) => {
        if (a.label < b.label) {
          return -1;
        }
        if (a.label > b.label) {
          return 1;
        }
        return 0;
      });
    }

    this._mediaStateTypeOptions = [];
    for (const stateType of this._mediaStateTypes) {
      this._mediaStateTypeOptions.push({
        label: `media state/${stateType.name} (ID: ${stateType.id})`,
        value: `media state/${stateType.name} (ID: ${stateType.id})`,
      });
    }
    sortList(this._mediaStateTypeOptions);

    this._localizationStateTypeOptions = [];
    for (const stateType of this._localizationStateTypes) {
      this._localizationStateTypeOptions.push({
        label: `localization state/${stateType.name} (ID: ${stateType.id})`,
        value: `localization state/${stateType.name} (ID: ${stateType.id})`,
      });
    }
    sortList(this._localizationStateTypeOptions);

    this._frameStateTypeOptions = [];
    for (const stateType of this._frameStateTypes) {
      this._frameStateTypeOptions.push({
        label: `frame state/${stateType.name} (ID: ${stateType.id})`,
        value: `frame state/${stateType.name} (ID: ${stateType.id})`,
      });
    }
    sortList(this._frameStateTypeOptions);

    this._localizationTypeOptions = [];
    for (const locType of this._localizationTypes) {
      this._localizationTypeOptions.push({
        label: `${locType.dtype}/${locType.name} (ID: ${locType.id})`,
        value: `${locType.dtype}/${locType.name} (ID: ${locType.id})`,
      });
    }
    sortList(this._localizationTypeOptions);

    this._mediaTypeOptions = [];
    for (const mediaType of this._mediaTypes) {
      this._mediaTypeOptions.push({
        label: `${mediaType.dtype}/${mediaType.name} (ID: ${mediaType.id})`,
        value: `${mediaType.dtype}/${mediaType.name} (ID: ${mediaType.id})`,
      });
    }
    sortList(this._mediaTypeOptions);

    this._userOptions = [];
    for (const user of this._memberships) {
      this._userOptions.push({
        label: `${user.first_name} ${user.last_name} (${user.username}) (ID: ${user.user})`,
        value: `${user.first_name} ${user.last_name} (${user.username}) (ID: ${user.user})`,
      });
    }
    sortList(this._userOptions);

    this._versionOptions = [];
    for (const version of this._versions) {
      this._versionOptions.push({
        label: `${version.name} (ID: ${version.id})`,
        value: `${version.name} (ID: ${version.id})`,
      });
    }
    sortList(this._versionOptions);

    this._sectionOptions = [];
    for (const section of this._sections) {
      this._sectionOptions.push({
        label: `${section.name} (ID: ${section.id})`,
        value: `${section.name} (ID: ${section.id})`,
      });
    }
    sortList(this._sectionOptions);

    this._archiveStateOptions = [
      { label: "live", value: "live" },
      { label: "to_archive", value: "to_archive" },
      { label: "archived", value: "archived" },
      { label: "to_live", value: "to_live" },
    ];
  }

  /**
   * @precondition createOptionsList() must have been executed
   * @postcondition this._allTypes is set
   *
   * This adds built-in attributes to the attribute_types list based on the entity type
   *
   * For Media Types:
   * $width | "Width" | float
   * $height | "Height" | float
   * $fps | "Frames Per Second" | float
   * $type | "Type" | this._mediaTypeOptions
   * $created_by | "Created By" | this._userOptions
   * $created_datetime | "Created Datetime" | datetime
   * $modified_by | "Modified By" | this._userOptions
   * $modified_datetime | "Modified Datetime" | datetime
   * $num_frames | "Number Of Frames" | int
   * $section | "Section" | this._sectionOptions
   * $id | "ID" | int
   * $name | "Name" | string
   * $archive_state | "Archive State" | this._archiveStateOptions
   * $elemental_id | "Elemental ID" | string
   *
   * For Localization Types:
   * $x | "X" | float
   * $y | "Y" | float
   * $u | "U" | float
   * $v | "V" | float
   * $width | "Width" | float
   * $height | "Height" | float
   * $version | "Version" | this._versionOptions
   * $type | "Type" | this._mediaTypeOptions
   * $created_by | "Created By" | this._userOptions
   * $created_datetime | "Created Datetime" | datetime
   * $modified_by | "Modified By" | this._userOptions
   * $modified_datetime | "Modified Datetime" | datetime
   * $id | "ID" | int
   * $elemental_id | "Elemental ID" | string
   * $frame | "Frame" | int
   *
   * For All State Types:
   * $version | "Version" | this._versionOptions
   * $type | "Type" | this._mediaTypeOptions
   * $created_by | "Created By" | this._userOptions
   * $created_datetime | "Created Datetime" | datetime
   * $modified_by | "Modified By" | this._userOptions
   * $modified_datetime | "Modified Datetime" | datetime
   * $id | "ID" | int
   * $elemental_id | "Elemental ID" | string
   * $frame | "Frame" | int
   */
  createEntityTypeList() {
    if (this._includeTypesList.includes("Media")) {
      for (const mediaType of this._mediaTypes) {
        let entityType = JSON.parse(JSON.stringify(mediaType));

        entityType.attribute_types.push({
          name: "$width",
          label: "Width",
          dtype: "float",
        });

        entityType.attribute_types.push({
          name: "$height",
          label: "Height",
          dtype: "float",
        });

        entityType.attribute_types.push({
          name: "$fps",
          label: "Frames Per Second",
          dtype: "float",
        });

        entityType.attribute_types.push({
          choices: this._mediaTypeOptions,
          name: "$type",
          label: "Type",
          dtype: "enum",
        });

        entityType.attribute_types.push({
          choices: this._userOptions,
          name: "$created_by",
          label: "Created By",
          dtype: "enum",
        });

        entityType.attribute_types.push({
          name: "$created_datetime",
          label: "Created Datetime",
          dtype: "datetime",
        });

        entityType.attribute_types.push({
          choices: this._userOptions,
          name: "$modified_by",
          label: "Modified By",
          dtype: "enum",
        });

        entityType.attribute_types.push({
          name: "$modified_datetime",
          label: "Modified Datetime",
          dtype: "datetime",
        });

        entityType.attribute_types.push({
          name: "$num_frames",
          label: "Number Of Frames",
          dtype: "int",
        });

        entityType.attribute_types.push({
          choices: this._sectionOptions,
          name: "$section",
          label: "Section",
          dtype: "enum",
        });

        entityType.attribute_types.push({
          name: "$id",
          label: "ID",
          dtype: "int",
        });

        entityType.attribute_types.push({
          name: "$name",
          label: "Name",
          dtype: "string",
        });

        this._allTypes.push(entityType);
      }
    }

    if (this._includeTypesList.includes("Localizations")) {
      for (const locType of this._localizationTypes) {
        let entityType = JSON.parse(JSON.stringify(locType));

        entityType.attribute_types.push({
          name: "$x",
          label: "x",
          dtype: "float",
        });

        entityType.attribute_types.push({
          name: "$y",
          label: "y",
          dtype: "float",
        });

        entityType.attribute_types.push({
          name: "$u",
          label: "u",
          dtype: "float",
        });

        entityType.attribute_types.push({
          name: "$v",
          label: "v",
          dtype: "float",
        });

        entityType.attribute_types.push({
          name: "$width",
          label: "Width",
          dtype: "float",
        });

        entityType.attribute_types.push({
          name: "$height",
          label: "Height",
          dtype: "float",
        });

        entityType.attribute_types.push({
          choices: this._versionOptions,
          name: "$version",
          label: "Version",
          dtype: "enum",
        });

        entityType.attribute_types.push({
          choices: this._localizationTypeOptions,
          name: "$type",
          label: "Type",
          dtype: "enum",
        });

        entityType.attribute_types.push({
          choices: this._userOptions,
          name: "$created_by",
          label: "Created By",
          dtype: "enum",
        });

        entityType.attribute_types.push({
          name: "$created_datetime",
          label: "Created Datetime",
          dtype: "datetime",
        });

        entityType.attribute_types.push({
          choices: this._userOptions,
          name: "$modified_by",
          label: "Modified By",
          dtype: "enum",
        });

        entityType.attribute_types.push({
          name: "$modified_datetime",
          label: "Modified Datetime",
          dtype: "datetime",
        });

        entityType.attribute_types.push({
          name: "$id",
          label: "ID",
          dtype: "int",
        });

        entityType.attribute_types.push({
          name: "$elemental_id",
          label: "Elemental ID",
          dtype: "string",
        });

        entityType.attribute_types.push({
          name: "$frame",
          label: "Frame",
          dtype: "int",
        });

        this._allTypes.push(entityType);
      }
    }

    var stateTypes = [];
    var typeChoices = [];
    if (this._includeTypesList.includes("MediaStates")) {
      stateTypes = stateTypes.concat(this._mediaStateTypes);
      typeChoices = typeChoices.concat(this._mediaStateTypeOptions);
    }
    if (this._includeTypesList.includes("LocalizationStates")) {
      stateTypes = stateTypes.concat(this._localizationStateTypes);
      typeChoices = typeChoices.concat(this._localizationStateTypeOptions);
    }
    if (this._includeTypesList.includes("FrameStates")) {
      stateTypes = stateTypes.concat(this._frameStateTypes);
      typeChoices = typeChoices.concat(this._frameStateTypeOptions);
    }

    for (const stateType of stateTypes) {
      let entityType = JSON.parse(JSON.stringify(stateType));

      entityType.attribute_types.push({
        choices: this._versionOptions,
        name: "$version",
        label: "Version",
        dtype: "enum",
      });

      entityType.attribute_types.push({
        choices: typeChoices,
        name: "$type",
        label: "Type",
        dtype: "enum",
      });

      entityType.attribute_types.push({
        choices: this._userOptions,
        name: "$created_by",
        label: "Created By",
        dtype: "enum",
      });

      entityType.attribute_types.push({
        name: "$created_datetime",
        label: "Created Datetime",
        dtype: "datetime",
      });

      entityType.attribute_types.push({
        choices: this._userOptions,
        name: "$modified_by",
        label: "Modified By",
        dtype: "enum",
      });

      entityType.attribute_types.push({
        name: "$modified_datetime",
        label: "Modified Datetime",
        dtype: "datetime",
      });

      entityType.attribute_types.push({
        name: "$id",
        label: "ID",
        dtype: "int",
      });

      entityType.attribute_types.push({
        name: "$elemental_id",
        label: "Elemental ID",
        dtype: "string",
      });

      entityType.attribute_types.push({
        name: "$frame",
        label: "Frame",
        dtype: "int",
      });

      this._allTypes.push(entityType);
    }
  }

  /**
   * Returns an array of all the types
   * init() must have been called prior to executing this
   *
   * @returns {array} - Array of all types that were saved during initialization
   */
  getEntityTypes() {
    return this._allTypes;
  }
}

/**
 * Variation of tator-data.js to support the new v1 filtering options
 */
class Utilities {
  constructor(projectId) {
    this._project = projectId;
  }

  /**
   *
   */
  async init() {
    await this.getAllMediaTypes();
    await this.getAllLocalizationTypes();
    await this.getAllStateTypes();
    await this.getAllVersions();
    await this.getAllSections();
    await this.getAllUsers();
    await this.getAllWorkflows();
  }

  /**
   * @precondition init() was executed
   */
  getStoredFrameStateTypes() {
    return this._stateTypeAssociations.frame;
  }

  /**
   * @precondition init() was executed
   */
  getStoredMediaStateTypes() {
    return this._stateTypeAssociations.media;
  }

  /**
   * @precondition init() was executed
   */
  getStoredLocalizationStateTypes() {
    return this._stateTypeAssociations.localization;
  }

  /**
   * @precondition init() was executed
   */
  getStoredMediaTypes() {
    return this._mediaTypes;
  }

  /**
   * @precondition init() was executed
   */
  getStoredLocalizationTypes() {
    return this._localizationTypes;
  }

  /**
   * @precondition init() was executed
   */
  getStoredVersions() {
    return this._versions;
  }

  /**
   * @precondition init() was executed
   */
  getStoredSections() {
    return this._sections;
  }

  /**
   * @precondition init() was executed
   */
  getStoredMemberships() {
    return this._memberships;
  }

  /**
   * @precondition init() was executed
   */
  getStoredWorkflows() {
    return this._workflows;
  }

  async getAllWorkflows() {
    this._workflows = [];
    var response = await fetchCredentials("/rest/Algorithms/" + this._project, {
      method: "GET",
    });
    this._workflows = await response.json();
  }

  /**
   * @postcondition this._memberships is set with array of Tator.Membership objects
   *                from this project
   */
  async getAllUsers() {
    this._memberships = [];
    var response = await fetchCredentials(
      "/rest/Memberships/" + this._project,
      {
        method: "GET",
      }
    );
    this._memberships = await response.json();
  }

  /**
   * @postcondition this._stateTypes is set with a list of Tator.StateType objects
   */
  async getAllStateTypes() {
    var donePromise = new Promise((resolve) => {
      const restUrl = "/rest/StateTypes/" + this._project;
      const dataPromise = fetchCredentials(restUrl, {
        method: "GET",
      });
      Promise.all([dataPromise]).then(([dataResponse]) => {
        const dataJson = dataResponse.json();
        Promise.all([dataJson]).then(([stateTypes]) => {
          this._stateTypes = [...stateTypes];
          this._stateTypeNames = [];
          this._stateTypes.forEach((typeElem) =>
            this._stateTypeNames.push(typeElem.name)
          );

          // Also separate out the state types into the different association types
          this._stateTypeAssociations = {
            media: [],
            frame: [],
            localization: [],
          };
          for (let idx = 0; idx < this._stateTypes.length; idx++) {
            const stateType = this._stateTypes[idx];
            if (stateType.association == "Media") {
              this._stateTypeAssociations.media.push(stateType);
            } else if (stateType.association == "Localization") {
              this._stateTypeAssociations.localization.push(stateType);
            } else if (stateType.association == "Frame") {
              this._stateTypeAssociations.frame.push(stateType);
            }
          }

          resolve();
        });
      });
    });

    await donePromise;
  }

  /**
   * @postcondition this._localizationTypes is set with a list of Tator.LocalizaitonType objects
   */
  async getAllLocalizationTypes() {
    var donePromise = new Promise((resolve) => {
      const restUrl = "/rest/LocalizationTypes/" + this._project;
      const dataPromise = fetchCredentials(restUrl, {
        method: "GET",
      });
      Promise.all([dataPromise]).then(([localizationResponse]) => {
        const localizationJson = localizationResponse.json();
        Promise.all([localizationJson]).then(([localizationTypes]) => {
          this._localizationTypes = [...localizationTypes];
          resolve();
        });
      });
    });

    await donePromise;

    this._localizationTypeNames = [];
    this._localizationTypes.forEach((typeElem) =>
      this._localizationTypeNames.push(typeElem.name)
    );

    return this._localizationTypes;
  }

  /**
   * @postcondition this._mediaTypes is set with a list of Tator.MediaType objects
   */
  async getAllMediaTypes() {
    var donePromise = new Promise((resolve) => {
      const restUrl = "/rest/MediaTypes/" + this._project;
      const dataPromise = fetchCredentials(restUrl, {
        method: "GET",
      });
      Promise.all([dataPromise]).then(([mediaResponse]) => {
        const mediaJson = mediaResponse.json();
        Promise.all([mediaJson]).then(([mediaTypes]) => {
          this._mediaTypes = [...mediaTypes];
          resolve();
        });
      });
    });

    await donePromise;

    this._mediaTypeNames = [];
    this._mediaTypes.forEach((typeElem) =>
      this._mediaTypeNames.push(typeElem.name)
    );
    return this._mediaTypes;
  }

  /**
   * @postcondition this._versions is set with a list of Tator.Version objects
   */
  async getAllVersions() {
    var donePromise = new Promise((resolve) => {
      const restUrl = "/rest/Versions/" + this._project;
      const dataPromise = fetchCredentials(restUrl, {
        method: "GET",
      });
      Promise.all([dataPromise]).then(([versionsResponse]) => {
        const versionsJson = versionsResponse.json();
        Promise.all([versionsJson]).then(([versions]) => {
          this._versions = [...versions];
          resolve();
        });
      });
    });

    await donePromise;
  }

  /**
   * @postcondition this._sections is set with a list of Tator.Section objects
   */
  async getAllSections() {
    var donePromise = new Promise((resolve) => {
      const restUrl = "/rest/Sections/" + this._project;
      const dataPromise = fetchCredentials(restUrl, {
        method: "GET",
      });
      Promise.all([dataPromise]).then(([sectionsResponse]) => {
        const sectionsJson = sectionsResponse.json();
        Promise.all([sectionsJson]).then(([sections]) => {
          this._sections = [...sections];
          resolve();
        });
      });
    });

    await donePromise;
  }
}

/**
 * Variation of entity-delete-button
 */
class FilterDeleteButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "btn-clear btn-outline d-flex flex-justify-center px-2 py-2 rounded-2 f2 text-white entity__button"
    );
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Delete";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M18 7v13c0 0.137-0.027 0.266-0.075 0.382-0.050 0.122-0.125 0.232-0.218 0.325s-0.203 0.167-0.325 0.218c-0.116 0.048-0.245 0.075-0.382 0.075h-10c-0.137 0-0.266-0.027-0.382-0.075-0.122-0.050-0.232-0.125-0.325-0.218s-0.167-0.203-0.218-0.325c-0.048-0.116-0.075-0.245-0.075-0.382v-13zM17 5v-1c0-0.405-0.081-0.793-0.228-1.148-0.152-0.368-0.375-0.698-0.651-0.974s-0.606-0.499-0.974-0.651c-0.354-0.146-0.742-0.227-1.147-0.227h-4c-0.405 0-0.793 0.081-1.148 0.228-0.367 0.152-0.697 0.375-0.973 0.651s-0.499 0.606-0.651 0.973c-0.147 0.355-0.228 0.743-0.228 1.148v1h-4c-0.552 0-1 0.448-1 1s0.448 1 1 1h1v13c0 0.405 0.081 0.793 0.228 1.148 0.152 0.368 0.375 0.698 0.651 0.974s0.606 0.499 0.974 0.651c0.354 0.146 0.742 0.227 1.147 0.227h10c0.405 0 0.793-0.081 1.148-0.228 0.368-0.152 0.698-0.375 0.974-0.651s0.499-0.606 0.651-0.974c0.146-0.354 0.227-0.742 0.227-1.147v-13h1c0.552 0 1-0.448 1-1s-0.448-1-1-1zM9 5v-1c0-0.137 0.027-0.266 0.075-0.382 0.050-0.122 0.125-0.232 0.218-0.325s0.203-0.167 0.325-0.218c0.116-0.048 0.245-0.075 0.382-0.075h4c0.137 0 0.266 0.027 0.382 0.075 0.122 0.050 0.232 0.125 0.325 0.218s0.167 0.203 0.218 0.325c0.048 0.116 0.075 0.245 0.075 0.382v1z"
    );
    svg.appendChild(path);
  }
}

customElements.define("filter-delete-button", FilterDeleteButton);

/**
 * Displays the AttributeOperationSpec in a human readable format and also
 * the encoded string
 */
class FilterOperationDisplay extends TatorElement {
  /**
   * Class constructor
   */
  constructor() {
    super();

    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute(
      "class",
      "d-flex flex-grow flex-column px-2 rounded-2"
    );
    this._mainDiv.style.border = "1px solid #262e3d";
    this._shadow.appendChild(this._mainDiv);

    this._titleDiv = document.createElement("div");
    this._titleDiv.setAttribute(
      "class",
      "h3 text-gray text-semibold px-2 pt-3 pb-1"
    );
    this._mainDiv.appendChild(this._titleDiv);

    this._operationDiv = document.createElement("div");
    this._operationDiv.setAttribute(
      "class",
      "f2 text-dark-gray px-2 py-2 my-2 rounded-2"
    );
    this._operationDiv.style.border = "1px solid #45536e";
    this._operationDiv.style.backgroundColor = "#00070D";
    this._mainDiv.appendChild(this._operationDiv);

    this._encodedDiv = document.createElement("div");
    this._encodedDiv.setAttribute("class", "f4 text-dark-gray px-2 py-2");
    this._mainDiv.appendChild(this._encodedDiv);
  }

  processAttributeCombinatorSpec(attributeCombinatorSpec) {
    var operationStringTokens = [];
    for (
      let index = 0;
      index < attributeCombinatorSpec.operations.length;
      index++
    ) {
      const operation = attributeCombinatorSpec.operations[index];

      if (operation.hasOwnProperty("attribute")) {
        operationStringTokens.push("(");
        operationStringTokens.push(
          `<span class="text-dark-gray">${operation.attribute}</span>`
        );
        if (operation.inverse) {
          operationStringTokens.push(`<span class="text-gray">NOT</span>`);
        }
        operationStringTokens.push(
          `<span class="text-gray">${operation.operation}</span>`
        );
        if (operation.value == "" || operation.value == null) {
          operationStringTokens.push(`<span class="text-dark-gray">""<span>`);
        } else {
          operationStringTokens.push(
            `<span class="text-dark-gray">${operation.value}<span>`
          );
        }
        operationStringTokens.push(")");
      } else {
        operationStringTokens.push("(");
        var groupTokens = this.processAttributeCombinatorSpec(operation);
        operationStringTokens = operationStringTokens.concat(groupTokens);
        operationStringTokens.push(")");
      }

      if (index < attributeCombinatorSpec.operations.length - 1) {
        operationStringTokens.push(
          `<span class="text-semibold text-gray px-1">${attributeCombinatorSpec.method}</span>`
        );
      }
    }
    return operationStringTokens;
  }

  /**
   * Sets the display with the provided AttributeCombinatorSpec
   */
  setDisplay(title, attributeCombinatorSpec, displayEncoded) {
    this._titleDiv.innerHTML = title;
    var stringTokens = this.processAttributeCombinatorSpec(
      attributeCombinatorSpec
    );
    var operationString = stringTokens.join(" ");
    this._operationDiv.innerHTML = operationString;

    if (displayEncoded) {
      this._encodedDiv.innerHTML = `<span style="word-break: break-all;">Encoded:<br />${btoa(
        JSON.stringify(attributeCombinatorSpec)
      )}</span>`;
    } else {
      this._encodedDiv.innerHTML = "";
    }
  }
}
customElements.define("filter-operation-display", FilterOperationDisplay);

/**
 * This is an updated variation of filter-condition.js
 */
class FilterAttributeOperation extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between flex-grow text-gray f2 rounded-2"
    );
    this._shadow.appendChild(this._div);

    this._innerDiv = document.createElement("div");
    this._innerDiv.setAttribute(
      "class",
      "d-flex flex-row flex-grow flex-items-center"
    );
    this._div.appendChild(this._innerDiv);

    this._deleteButton = document.createElement("filter-delete-button");
    this._deleteButton.style.marginLeft = "15px";
    this._innerDiv.appendChild(this._deleteButton);

    this._attribute = document.createElement("enum-input");
    this._attribute.setAttribute("name", "Attribute");
    this._attribute.style.marginLeft = "15px";
    this._attribute.permission = "View Only";
    this._attribute._select.classList.remove("col-8");
    this._attribute._select.classList.add("col-11");
    this._attribute._select.classList.add("ml-3");
    this._innerDiv.appendChild(this._attribute);

    this._operation = document.createElement("enum-input");
    this._operation.style.marginLeft = "15px";
    this._operation.setAttribute("name", "Operation");
    this._operation.permission = "View Only";
    this._operation._select.classList.remove("col-8");
    this._operation._select.classList.add("col-11");
    this._operation._select.classList.add("ml-3");
    this._operation.style.minWidth = "220px";
    this._innerDiv.appendChild(this._operation);

    this._value = document.createElement("text-input");
    this._value.style.marginLeft = "15px";
    this._value.setAttribute("name", "Value");
    this._value.permission = "View Only";
    this._value._input.classList.remove("col-8");
    this._value._input.classList.add("flex-grow");
    this._value._name.classList.add("mr-3");
    this._value.style.minWidth = "400px";
    this._innerDiv.appendChild(this._value);

    this._valueBool = document.createElement("enum-input");
    this._valueBool.style.marginLeft = "15px";
    this._valueBool.setAttribute("name", "Value");
    this._valueBool.permission = "View Only";
    this._valueBool.choices = [{ value: "true" }, { value: "false" }];
    this._valueBool.style.display = "none";
    this._valueBool._select.classList.remove("col-8");
    this._valueBool._select.classList.add("ml-3");
    this._valueBool._select.classList.add("flex-grow");
    this._innerDiv.appendChild(this._valueBool);

    this._valueEnum = document.createElement("enum-input");
    this._valueEnum.style.marginLeft = "15px";
    this._valueEnum.setAttribute("name", "Value");
    this._valueEnum.permission = "View Only";
    this._valueEnum.style.display = "none";
    this._valueEnum._select.classList.remove("col-8");
    this._valueEnum._select.classList.add("ml-3");
    this._valueEnum._select.classList.add("flex-grow");
    this._innerDiv.appendChild(this._valueEnum);

    this._valueDate = document.createElement("datetime-input");
    this._valueDate.style.marginLeft = "15px";
    this._valueDate.setAttribute("name", "Value");
    this._valueDate.permission = "View Only";
    this._valueDate.style.display = "none";
    this._valueDate._innerLabel.classList.remove("col-4");
    this._valueDate._innerLabel.classList.add("mr-3");
    this._valueDate.style.minWidth = "400px";
    this._innerDiv.appendChild(this._valueDate);

    this._deleteButton.addEventListener("click", () => {
      this.dispatchEvent(new Event("remove"));
    });
    this._deleteButton._button.addEventListener("mouseover", () => {
      this._div.style.backgroundColor = "#151b28";
    });
    this._deleteButton._button.addEventListener("mouseout", () => {
      this._div.style.backgroundColor = "";
    });

    this._attribute.addEventListener(
      "change",
      this.attributeSelectedCallback.bind(this)
    );

    this._operation.addEventListener(
      "change",
      this.operationSelectedCallback.bind(this)
    );

    this._value.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });
    this._valueBool.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });
    this._valueEnum.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });
    this._valueDate.addEventListener("change", () => {
      this.dispatchEvent(new Event("change"));
    });
  }

  setAttributeChoices(entityTypes) {
    // Remove existing choices
    this._attribute.clear();
    this._operation.clear();
    this._value.setValue("");

    // Create the menu options for the field name
    var fieldChoices = [];
    var attributeChoices = [];
    var uniqueFieldChoices = [];

    for (const entityType of entityTypes) {
      for (const attribute of entityType.attribute_types) {
        if (uniqueFieldChoices.indexOf(attribute.name) < 0) {
          if (attribute.label) {
            fieldChoices.push({
              value: attribute.name,
              label: attribute.label,
            });
          } else {
            attributeChoices.push({
              value: attribute.name,
              label: attribute.name,
            });
          }
          uniqueFieldChoices.push(attribute.name);
        }
      }
    }

    fieldChoices.sort((a, b) => {
      return a.label.localeCompare(b.label);
    });
    attributeChoices.sort((a, b) => {
      return a.label.localeCompare(b.label);
    });

    this._attribute.choices = {
      "Built-in Fields": fieldChoices,
      Attributes: attributeChoices,
    };
    this._attribute.permission = "Can Edit";
    this._attribute.selectedIndex = -1;
    this._operation.permission = "View Only";
    this._value.permission = "View Only";
    this._valueBool.permission = "View Only";
    this._valueEnum.permission = "View Only";
    this._valueDate.permission = "View Only";
    this.attributeSelectedCallback();
  }

  attributeSelectedCallback() {
    // Remove existing choices for the modifier and clear the value
    this._operation.clear();
    this._valueEnum.clear();
    this._value.setValue("");

    let selectedFieldName = this._attribute.getValue();
    var dtype = "string";
    var selectedAttributeType;

    var uniqueFieldChoices = [];

    for (const currentType of this._entityTypes) {
      for (const attribute of currentType.attribute_types) {
        if (attribute.name == selectedFieldName) {
          selectedAttributeType = attribute;
          dtype = attribute.dtype;
          if (dtype == "enum") {
            let enumChoices = [];
            for (let i in attribute.choices) {
              const choiceValue = attribute.choices[i];
              let choice;
              let label;

              if (
                typeof choiceValue == "object" &&
                typeof choiceValue.value !== "undefined"
              ) {
                choice = choiceValue.value;
                label =
                  typeof choiceValue.label !== "undefined"
                    ? choiceValue.label
                    : choice;
              } else {
                choice = choiceValue;
                label = choice;
              }

              if (uniqueFieldChoices.indexOf(choice) < 0) {
                enumChoices.push({ value: choice, label: label });
                uniqueFieldChoices.push(choice);
              }
            }
            this._valueEnum.choices = enumChoices;
          }
          break;
        }
      }
    }

    this._currentDtype = dtype;

    var choices = [];
    var dtype = selectedAttributeType.dtype;

    if (dtype == "enum") {
      choices.push({ value: "==" });
      choices.push({ value: "NOT ==" });
      choices.push({ value: "isnull" });
      choices.push({ value: "NOT isnull" });
    } else if (dtype == "int" || dtype == "float" || dtype == "datetime") {
      choices.push({ value: "==" });
      choices.push({ value: ">" });
      choices.push({ value: ">=" });
      choices.push({ value: "<" });
      choices.push({ value: "<=" });
      choices.push({ value: "isnull" });
      choices.push({ value: "NOT ==" });
      choices.push({ value: "NOT >" });
      choices.push({ value: "NOT >=" });
      choices.push({ value: "NOT <" });
      choices.push({ value: "NOT <=" });
      choices.push({ value: "NOT isnull" });
    } else if (dtype == "bool") {
      choices.push({ value: "==" });
      choices.push({ value: "isnull" });
      choices.push({ value: "NOT isnull" });
    } else if (dtype == "string") {
      choices.push({ value: "includes" });
      choices.push({ value: "==" });
      choices.push({ value: "starts with" });
      choices.push({ value: "ends with" });
      choices.push({ value: "isnull" });
      choices.push({ value: "NOT includes" });
      choices.push({ value: "NOT ==" });
      choices.push({ value: "NOT starts with" });
      choices.push({ value: "NOT ends with" });
      choices.push({ value: "NOT isnull" });
    } else if (dtype == "geopos") {
      choices.push({ value: "Distance <=" });
      choices.push({ value: "NOT Distance <=" });
    } else {
      console.error(`Can't handle filter ops on dtype='{$dtype}'`);
    }

    this._operation.choices = choices;
    this._operation.permission = "Can Edit";
    this._operation.selectedIndex = -1;
    this.operationSelectedCallback();
  }

  operationSelectedCallback() {
    const modifier = this._operation.getValue();

    this._value.style.display = "block";
    this._valueBool.style.display = "none";
    this._valueEnum.style.display = "none";
    this._valueDate.style.display = "none";

    if (modifier.includes("null")) {
      this._value.style.display = "none";
    } else if (
      this._currentDtype == "enum" &&
      (modifier == "==" || modifier == "NOT ==")
    ) {
      this._value.style.display = "none";
      this._valueBool.style.display = "none";
      this._valueEnum.style.display = "block";
      this._valueDate.style.display = "none";
    } else if (this._currentDtype == "bool") {
      this._value.style.display = "none";
      this._valueBool.style.display = "block";
      this._valueEnum.style.display = "none";
      this._valueDate.style.display = "none";
    } else if (this._currentDtype == "datetime") {
      this._value.style.display = "none";
      this._valueBool.style.display = "none";
      this._valueEnum.style.display = "none";
      this._valueDate.style.display = "block";
    }

    this._value.permission = "Can Edit";
    this._valueBool.permission = "Can Edit";
    this._valueEnum.permission = "Can Edit";
    this._valueDate.permission = "Can Edit";

    this.dispatchEvent(new Event("change"));
  }

  /**
   * @param {array} entityTypes - List of entity types to populate the attribute dropdown
   *                              (e.g. list of Tator.MediaType objects)
   *
   * This must be set prior to the user interacting with the element
   */
  setEntityTypes(entityTypes) {
    this._entityTypes = entityTypes;
    this.setAttributeChoices(entityTypes);
  }

  /**
   * @return {Tator.AttributeFilterSpec} Valid attribute filter spec for the REST endpoints
   */
  getAttributeFilterSpec() {
    var operationField = this._operation.getValue();
    var operation = null;
    var inverse = false;
    var val = null;
    if (operationField.includes("NOT")) {
      inverse = true;
      operationField = operationField.replace("NOT ", "");
    }
    // Valid operations:
    // eq, gt, gte, lt, lte, icontains, iendswith, istartswith, isnull, date_eq, date_gte, date_gt, date_lt, date_lte, date_range, distance_lte
    if (operationField == "==") {
      if (this._currentDtype == "datetime") {
        operation = "date_eq";
      } else {
        operation = "eq";
      }
    } else if (operationField == ">") {
      if (this._currentDtype == "datetime") {
        operation = "date_gt";
      } else {
        operation = "gt";
      }
    } else if (operationField == ">=") {
      if (this._currentDtype == "datetime") {
        operation = "date_gte";
      } else {
        operation = "gte";
      }
    } else if (operationField == "<") {
      if (this._currentDtype == "datetime") {
        operation = "date_lt";
      } else {
        operation = "lt";
      }
    } else if (operationField == "<=") {
      if (this._currentDtype == "datetime") {
        operation = "date_lte";
      } else {
        operation = "lte";
      }
    } else if (operationField == "includes") {
      operation = "icontains";
    } else if (operationField == "ends with") {
      operation = "iendswith";
    } else if (operationField == "starts with") {
      operation = "istartswith";
    } else if (operationField == "isnull") {
      operation = "isnull";
      val = true;
    } else if (operationField == "Distance <=") {
      operation = "distance_lte";
    } else {
      console.error("Unknown operation: " + operationField);
    }

    if (val != null) {
      return {
        attribute: this._attribute.getValue(),
        operation: operation,
        inverse: inverse,
        value: val,
      };
    }

    if (this._valueEnum.style.display == "block") {
      var attrValue = this._valueEnum.getValue();
      if (attrValue.includes("(ID:")) {
        attrValue = Number(attrValue.split("ID: ")[1].split(")")[0]);
      }
      return {
        attribute: this._attribute.getValue(),
        operation: operation,
        inverse: inverse,
        value: attrValue,
      };
    } else if (this._valueBool.style.display == "block") {
      return {
        attribute: this._attribute.getValue(),
        operation: operation,
        inverse: inverse,
        value: this._valueBool.getValue(),
      };
    } else if (this._valueDate.style.display == "block") {
      return {
        attribute: this._attribute.getValue(),
        operation: operation,
        inverse: inverse,
        value: this._valueDate.getValue(),
      };
    } else {
      return {
        attribute: this._attribute.getValue(),
        operation: operation,
        inverse: inverse,
        value: this._value.getValue(),
      };
    }
  }

  setValue(attribute, operation, value) {
    try {
      var choices = this._attribute.getChoices();
      if (choices.includes(attribute) == false) {
        return false;
      }
      this._attribute.setValue(attribute);
      this.attributeSelectedCallback();

      var choices = this._operation.getChoices();
      if (choices.includes(operation) == false) {
        return false;
      }
      this._operation.setValue(operation);
      this.operationSelectedCallback();

      if (this._valueEnum.style.display == "block") {
        var choices = this._valueEnum.getChoices();
        if (choices.includes(value) == false) {
          return false;
        }
        this._valueEnum.setValue(value);
      } else if (this._valueBool.style.display == "block") {
        this._valueBool.setValue(value);
      } else if (this._valueDate.style.display == "block") {
        this._valueDate.setValue(value);
      } else {
        this._value.setValue(value);
      }
    } catch (e) {
      console.error(e);
      return false;
    }

    return true;
  }
}
customElements.define("filter-attribute-operation", FilterAttributeOperation);

/**
 * HTML element that encompasses an encoded search object.
 */
class FilterGroup extends TatorElement {
  /**
   * Class constructor
   * Data initialization is performed separately. UI initialization performed here.
   */
  constructor() {
    super();

    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute(
      "class",
      "d-flex flex-grow flex-column rounded-1"
    );
    this._mainDiv.style.border = "1px solid #45536e";
    this._shadow.appendChild(this._mainDiv);

    this.createHeaderSection();
    this.createOperationsSection();
  }

  /**
   * Expected to only be called once at initialization
   */
  createHeaderSection() {
    this._header = document.createElement("div");
    this._header.setAttribute(
      "class",
      "d-flex flex-grow flex-justify-between px-1"
    );
    this._header.style.backgroundColor = "#262e3d"; // color-charcoal-light
    this._mainDiv.appendChild(this._header);

    //
    // Add condition and add group button are grouped together
    // AND/OR menu option
    // Delete button (if enabled) is by itself
    //

    //
    // Add section
    //
    var sectionDiv = document.createElement("div");
    sectionDiv.setAttribute(
      "class",
      "d-flex flex-items-center rounded-1 py-1 px-1 text-gray f2"
    );
    this._header.appendChild(sectionDiv);

    this._addConditionButton = document.createElement("button");
    sectionDiv.appendChild(this._addConditionButton);
    this._addConditionButton.setAttribute(
      "class",
      "btn-clear d-flex flex-justify-center flex-items-center px-2 py-2 rounded-2 f2 text-white entity__button"
    );
    this._addConditionButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="16" height="16" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" />
        </svg>
        <span class="ml-3">Add Condition</span>
    `;
    this._addConditionButton.addEventListener("click", () => {
      this._addConditionButton.blur();
      this.addFilterOperation();
    });

    this._addGroupButton = document.createElement("button");
    sectionDiv.appendChild(this._addGroupButton);
    this._addGroupButton.setAttribute(
      "class",
      "ml-2 btn-clear d-flex flex-justify-center flex-items-center px-2 py-2 rounded-2 f2 text-white entity__button"
    );
    this._addGroupButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="16" height="16" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" />
        </svg>
        <span class="ml-3">Add Group</span>
    `;
    this._addGroupButton.addEventListener("click", () => {
      this._addGroupButton.blur();
      const group = document.createElement("filter-group");
      group.setAttribute("class", "mx-1 my-1 py-3");
      group._deleteButton.hidden = false;
      group._entityTypes = this._entityTypes;
      this._body.prepend(group);
      this.dispatchEvent(new Event("change"));

      group.addEventListener("remove", () => {
        this._body.removeChild(group);
        this.dispatchEvent(new Event("change"));
      });
      group.addEventListener("change", () => {
        this.dispatchEvent(new Event("change"));
      });
    });

    //
    // Add Operations (AND/OR menu option)
    //
    var sectionDiv = document.createElement("div");
    sectionDiv.setAttribute(
      "class",
      "d-flex flex-items-center rounded-1 py-1 px-1 text-gray f2"
    );
    this._header.appendChild(sectionDiv);

    this._methodSelector = document.createElement("enum-input");
    this._methodSelector._name.innerHTML = `
      <div class="d-flex flex-items-center text-white">
      <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="32" height="32" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 4m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /><path d="M4 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /><path d="M9 15l6 -6" />
      </svg>
      Combine Method:</div>`;
    this._methodSelector._select.classList.remove("col-8");
    this._methodSelector._select.style.marginLeft = "10px";
    this._methodSelector.choices = [
      { value: "AND", label: "AND" },
      { value: "OR", label: "OR" },
    ];
    this._methodSelector.setValue("AND");
    sectionDiv.appendChild(this._methodSelector);

    this._methodSelector.addEventListener("change", () => {
      this._methodSelector.blur();
      this.dispatchEvent(new Event("change"));
    });

    //
    // Delete button
    //
    var sectionDiv = document.createElement("div");
    sectionDiv.setAttribute(
      "class",
      "d-flex flex-items-center rounded-1 py-1 px-1 text-gray f2"
    );
    this._header.appendChild(sectionDiv);

    this._deleteButton = document.createElement("filter-delete-button");
    this._deleteButton.hidden = true;
    sectionDiv.appendChild(this._deleteButton);

    this._deleteButton.addEventListener("click", () => {
      this._deleteButton.blur();
      this.dispatchEvent(new Event("remove"));
      this.dispatchEvent(new Event("change"));
    });
  }

  forceToAND() {
    this._methodSelector.resetChoices();
    this._methodSelector.choices = [{ value: "AND", label: "AND" }];
    this._methodSelector.setValue("AND");
  }

  forceToOR() {
    this._methodSelector.resetChoices();
    this._methodSelector.choices = [{ value: "OR", label: "OR" }];
    this._methodSelector.setValue("OR");
  }

  allowANDOR() {
    this._methodSelector.resetChoices();
    this._methodSelector.choices = [
      { value: "AND", label: "AND" },
      { value: "OR", label: "OR" },
    ];
    this._methodSelector.setValue("AND");
  }

  addSelectedTypes(typeIds) {
    const elem = document.createElement("filter-group");
    elem.setAttribute("class", "mx-1 my-1 py-3");
    elem._entityTypes = this._entityTypes;
    elem.forceToOR();
    elem._addConditionButton.style.display = "none";
    elem._addGroupButton.style.display = "none";
    this._body.appendChild(elem);

    console.log(`Attemping to add typeIds to filter: ${typeIds}`);

    for (const attrType of this._entityTypes[0].attribute_types) {
      if (attrType["name"] == "$type") {
        for (const choice of attrType.choices) {
          var this_id = parseInt(choice.label.split("ID: ")[1].split(")")[0]);
          if (typeIds.includes(this_id)) {
            elem.addFilterOperation(true, "$type", "==", choice.label);
          }
        }
        break;
      }
    }

    this.dispatchEvent(new Event("change"));
  }

  addSelectedMediaIds(mediaIds) {
    const elem = document.createElement("filter-group");
    elem.setAttribute("class", "mx-1 my-1 py-3");
    elem._entityTypes = this._entityTypes;
    elem.forceToOR();
    elem._addConditionButton.style.display = "none";
    elem._addGroupButton.style.display = "none";
    this._body.appendChild(elem);

    console.log(`Attemping to add mediaIds to filter: ${mediaIds}`);

    for (const mediaId of mediaIds) {
      elem.addFilterOperation(true, "$id", "==", mediaId);
    }

    this.dispatchEvent(new Event("change"));
  }

  addSelectedSections(sectionIds) {
    const elem = document.createElement("filter-group");
    elem.setAttribute("class", "mx-1 my-1 py-3");
    elem._entityTypes = this._entityTypes;
    elem.forceToOR();
    elem._addConditionButton.style.display = "none";
    elem._addGroupButton.style.display = "none";
    this._body.appendChild(elem);

    console.log(`Attemping to add sectionIds to filter: ${sectionIds}`);

    for (const sectionId of sectionIds) {
      elem.addFilterOperation(true, "$section", "==", sectionId);
    }

    this.dispatchEvent(new Event("change"));
  }

  addFilterOperation(readOnly, attribute, operation, value) {
    const elem = document.createElement("filter-attribute-operation");
    elem.setEntityTypes(this._entityTypes);
    this._body.prepend(elem);

    if (
      attribute != undefined &&
      operation != undefined &&
      value != undefined
    ) {
      var valueSet = elem.setValue(attribute, operation, value);
      if (valueSet == false) {
        console.error(
          "Failed to set value for filter operation. Deleting condition"
        );
        this._body.removeChild(elem);
        return;
      }
    }

    if (readOnly == true) {
      elem._attribute.permission = "View Only";
      elem._operation.permission = "View Only";
      elem._value.permission = "View Only";
      elem._valueBool.permission = "View Only";
      elem._valueEnum.permission = "View Only";
      elem._valueDate.permission = "View Only";
      elem._deleteButton.hidden = true;
    } else {
      elem.addEventListener("remove", () => {
        this._body.removeChild(elem);
        this.dispatchEvent(new Event("change"));
      });
      elem.addEventListener("change", () => {
        this.dispatchEvent(new Event("change"));
      });
    }

    this.dispatchEvent(new Event("change"));
  }

  clear() {
    this._body.innerHTML = "";
  }

  /**
   * Expected to only be called once at initialization
   */
  createOperationsSection() {
    this._body = document.createElement("div");
    this._body.setAttribute(
      "class",
      "d-flex flex-grow flex-justify-between flex-column px-2 py-2"
    );
    this._body.style.backgroundColor = "#00070D";
    this._mainDiv.appendChild(this._body);
  }

  /**
   * @param {array} entityTypes
   */
  setEntityTypes(entityTypes) {
    this._entityTypes = entityTypes;
    this.dispatchEvent(new Event("change"));
  }

  /**
   * @return {Tator.AttributeCombinatorSpec} Valid AttributeCombinatorSpec for REST endpoint searches
   */
  getAttributeCombinatorSpec() {
    var spec = {
      method: this._methodSelector.getValue(),
      operations: [],
    };

    for (let i = 0; i < this._body.children.length; i++) {
      const child = this._body.children[i];
      if (child instanceof FilterAttributeOperation) {
        spec.operations.push(child.getAttributeFilterSpec());
      } else if (child instanceof FilterGroup) {
        spec.operations.push(child.getAttributeCombinatorSpec());
      }
    }

    return spec;
  }
}
customElements.define("filter-group", FilterGroup);

class LoadingInterface {
  constructor(dom) {
    this._loadingScreen = dom.getElementById("loadingScreen");
    this._loadingScreenText = dom.getElementById("loadingScreenText");
  }

  displayLoadingScreen(message) {
    this._loadingScreen.style.display = "block";
    this._loadingScreen.classList.add("has-open-modal");

    if (message) {
      this._loadingScreenText.innerHTML = `<div class="text-semibold d-flex flex-column">${message}</div>`;
    } else {
      this._loadingScreenText.innerHTML = `<div class="text-semibold">Loading...</div>`;
    }
  }

  hideLoadingScreen() {
    this._loadingScreen.classList.remove("has-open-modal");
    this._loadingScreen.style.display = "none";
  }
}

/**
 * Singleton class for this dashboard's UI
 */
class MainPage extends TatorPage {
  /**
   * @param {int} projectId - Project ID associated with where the dashboard is registered
   */
  constructor() {
    super();
    const template = document.querySelector("#export-page");
    const clone = document.importNode(template.content, true);
    this._shadow.appendChild(clone);

    this._projectId = window.location.pathname.split("/")[1];
    this._utils = new Utilities(this._projectId);
    this._loadingInterface = new LoadingInterface(this._shadow);
    this._selectedSectionIds = [];
    this._selectedMediaIds = [];

    var urlParams = new URLSearchParams(window.location.search);
    var sectionIds = urlParams.get("section");
    if (sectionIds) {
      this._selectedSectionIds = sectionIds.split(",").map(Number);
    } else {
      var mediaIds = urlParams.get("media_id");
      if (mediaIds) {
        this._selectedMediaIds = mediaIds.split(",").map(Number);
      }
    }

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
  }

  connectedCallback() {
    store.getState().init();
    this.init().then(() => {
      this.switchQueryPage("queryType");
      this._loadingInterface.hideLoadingScreen();
    });
  }

  //
  // Data Methods - Initialization
  //

  /**
   * Query registered entity types and setup the filter interface(s)
   * Expected to run once at initialization of the page
   *
   * @postcondition UI is initialized with entity type information
   */
  async init() {
    //
    // Query the registered types
    //
    await this._utils.init();
    this._localizationFilterData = new FilterData(this._utils, [
      "Localizations",
    ]);
    this._stateFilterData = new FilterData(this._utils, [
      "MediaStates",
      "LocalizationStates",
      "FrameStates",
    ]);
    this._stateAndLocalizationFilterData = new FilterData(this._utils, [
      "Localizations",
      "MediaStates",
      "LocalizationStates",
      "FrameStates",
    ]);
    this._mediaFilterData = new FilterData(this._utils, ["Media"]);
    this._currentQueryID = 0;

    //
    // UI Initialization
    //
    this.initializeQueryTypePage();
    this.initializePageButtons();
    this.initializeExportPage();
  }

  /**
   * Retrieves the media/localization/state count based on the selected filters
   */
  async updateQueryPage(queryID) {
    var div = this._shadow.getElementById("pageQueryData_resultCount");
    div.innerHTML = `<span class="text-gray">Querying...</span>`;

    this._exportDataButton.setAttribute("disabled", "");

    var mediaFilters = this._mediaFilterGroup.getAttributeCombinatorSpec();
    var metadataFilters =
      this._metadataFilterGroup.getAttributeCombinatorSpec();

    var queryCountError = false;
    var queryCount = 0;
    var mediaQueryCount = 0;

    try {
      var paramString = "";
      if (mediaFilters != undefined && mediaFilters.operations.length > 0) {
        paramString += `&encoded_search=${btoa(JSON.stringify(mediaFilters))}`;
      }
      if (
        metadataFilters != undefined &&
        metadataFilters.operations.length > 0
      ) {
        paramString += `&encoded_related_search=${btoa(
          JSON.stringify(metadataFilters)
        )}`;
      }
      var response = await fetchCredentials(
        `/rest/MediaCount/${this._projectId}?${paramString}`,
        {
          method: "GET",
        }
      );
      if (response.status != 200) {
        throw new Error(`Failed to fetch media count: ${response.status}`);
      }
      var count = await response.json();
      mediaQueryCount = count;
      queryCount = count;
      console.log(`${count} media matching filter`);

      if (this._queryType == "localizations") {
        var paramString = "";
        if (
          metadataFilters != undefined &&
          metadataFilters.operations.length > 0
        ) {
          paramString += `&encoded_search=${btoa(
            JSON.stringify(metadataFilters)
          )}`;
        }
        if (mediaFilters != undefined && mediaFilters.operations.length > 0) {
          paramString += `&encoded_related_search=${btoa(
            JSON.stringify(mediaFilters)
          )}`;
        }
        var response = await fetchCredentials(
          `/rest/LocalizationCount/${this._projectId}?${paramString}`,
          {
            method: "GET",
          }
        );
        if (response.status != 200) {
          throw new Error(
            `Failed to fetch localization count: ${response.status}`
          );
        }
        var count = await response.json();
        queryCount = count;
        console.log(`${count} localizations matching filter`);
      } else if (this._queryType == "states") {
        var paramString = "";
        if (
          metadataFilters != undefined &&
          metadataFilters.operations.length > 0
        ) {
          paramString += `&encoded_search=${btoa(
            JSON.stringify(metadataFilters)
          )}`;
        }
        if (mediaFilters != undefined && mediaFilters.operations.length > 0) {
          paramString += `&encoded_related_search=${btoa(
            JSON.stringify(mediaFilters)
          )}`;
        }
        var response = await fetchCredentials(
          `/rest/StateCount/${this._projectId}?${paramString}`,
          {
            method: "GET",
          }
        );
        if (response.status != 200) {
          throw new Error(`Failed to fetch state count: ${response.status}`);
        }
        var count = await response.json();
        queryCount = count;
        console.log(`${count} states matching filter`);
      }
    } catch (error) {
      queryCount = 0;
      mediaQueryCount = 0;
      queryCountError = true;
      console.error(error);
    }

    if (queryID == this._currentQueryID) {
      this._queryCount = queryCount;
      this._mediaQueryCount = mediaQueryCount;
      this._queryCountError = queryCountError;
    }
  }

  /**
   * Create the csv from the provided data
   */
  async createCSV(allData, allMediaData) {
    this._loadingInterface.displayLoadingScreen(`Creating report file...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    var rows = [];
    var header = [];

    if (
      this._relatedSelectedBuiltInAttributes.length > 0 ||
      this._relatedSelectedUserAttributes.length > 0
    ) {
      for (const attrName of this._relatedSelectedBuiltInAttributes) {
        header.push(attrName);
      }
      for (const attrName of this._relatedSelectedUserAttributes) {
        header.push(attrName);
      }
    }
    for (const attrName of this._selectedBuiltInAttributes) {
      header.push(attrName);
    }
    for (const attrName of this._selectedUserAttributes) {
      header.push(attrName);
    }
    rows.push(header);

    for (const data of allData) {
      var media_list = [];
      var media_ids = [];
      var media_names = [];
      var section_ids = [];
      var section_names = [];

      try {
        //
        // First get all the associated media and section information
        //

        if (data.hasOwnProperty("media")) {
          if (Array.isArray(data.media)) {
            for (const mediaId of data.media) {
              for (const mediaData of allMediaData) {
                if (mediaData.id == mediaId) {
                  media_names.push(mediaData.name);
                  media_ids.push(mediaData.id);
                  media_list.push(mediaData);
                  for (const section of this._utils._sections) {
                    if (
                      section.tator_user_sections ==
                      mediaData.attributes["tator_user_sections"]
                    ) {
                      section_ids.push(section.id);
                      section_names.push(section.name);
                      break;
                    }
                  }
                  break;
                }
              }
            }
          } else {
            for (const mediaData of allMediaData) {
              if (mediaData.id == data.media) {
                media_names.push(mediaData.name);
                media_ids.push(mediaData.id);
                media_list.push(mediaData);
                for (const section of this._utils._sections) {
                  if (
                    section.tator_user_sections ==
                    mediaData.attributes["tator_user_sections"]
                  ) {
                    section_ids.push(section.id);
                    section_names.push(section.name);
                    break;
                  }
                }
                break;
              }
            }
          }
        } else {
          for (const section of this._utils._sections) {
            if (
              section.tator_user_sections ==
              data.attributes["tator_user_sections"]
            ) {
              section_ids.push(section.id);
              section_names.push(section.name);
              break;
            }
          }
        }
      } catch (e) {
        console.error(e);
      }

      //
      // Next get other information associated with the entity
      //

      var version = null;
      try {
        for (const obj of this._utils._versions) {
          if (obj.id == data.version) {
            version = obj;
            break;
          }
        }
      } catch (e) {
        console.error(e);
      }

      var created_by = null;
      try {
        for (const obj of this._utils._memberships) {
          if (obj.user == data.created_by) {
            created_by = obj;
            break;
          }
        }
      } catch (e) {
        console.error(e);
      }

      var modified_by = null;
      try {
        for (const obj of this._utils._memberships) {
          if (obj.user == data.modified_by) {
            modified_by = obj;
            break;
          }
        }
      } catch (e) {
        console.error(e);
      }

      var entityType = null;
      try {
        if (this._queryType == "media") {
          for (const obj of this._utils._mediaTypes) {
            if (obj.id == data.type) {
              entityType = obj;
              break;
            }
          }
        } else if (this._queryType == "localizations") {
          for (const obj of this._utils._localizationTypes) {
            if (obj.id == data.type) {
              entityType = obj;
              break;
            }
          }
        } else if (this._queryType == "states") {
          for (const obj of this._utils._stateTypes) {
            if (obj.id == data.type) {
              entityType = obj;
              break;
            }
          }
        }
      } catch (e) {
        console.error(e);
      }

      //
      // Finally let's loop over the attributes.
      //

      if (this._queryType == "media" && media_list.length == 0) {
        media_list.push(data);
      }
      for (const media of media_list) {
        var row = [];

        // Find the user who created the media
        // Find the user who last modified the media
        var media_created_by = null;
        var media_modified_by = null;
        var media_type = null;
        var media_section = null;
        try {
          for (const obj of this._utils._memberships) {
            if (obj.user == media.created_by) {
              media_created_by = obj;
            }
            if (obj.user == media.modified_by) {
              media_modified_by = obj;
            }
          }
          for (const obj of this._utils._mediaTypes) {
            if (obj.id == media.type) {
              media_type = obj;
              break;
            }
          }
          for (const section of this._utils._sections) {
            if (
              section.tator_user_sections ==
              media.attributes["tator_user_sections"]
            ) {
              media_section = section;
              break;
            }
          }
        } catch (e) {
          console.error(e);
        }

        for (const attrName of this._relatedSelectedBuiltInAttributes) {
          attrVal = "";
          try {
            if (attrName == "(media) $id") {
              attrVal = media.id;
            } else if (attrName == "(media) $name") {
              attrVal = media.name;
            } else if (attrName == "(media) $section_id") {
              attrVal = media_section.id;
            } else if (attrName == "(media) $section_name") {
              attrVal = media_section.name;
            } else if (attrName == "(media) $created_by_id") {
              attrVal = media.created_by;
            } else if (attrName == "(media) $created_by_username") {
              attrVal = media_created_by.username;
            } else if (attrName == "(media) $created_by_name") {
              attrVal = `${media_created_by.first_name} ${media_created_by.last_name}`;
            } else if (attrName == "(media) $created_datetime") {
              attrVal = media.created_datetime;
            } else if (attrName == "(media) $modified_by_id") {
              attrVal = media.modified_by;
            } else if (attrName == "(media) $modified_by_username") {
              if (media_modified_by != null) {
                attrVal = media_modified_by.username;
              }
            } else if (attrName == "(media) $modified_by_name") {
              if (media_modified_by != null) {
                attrVal = `${media_modified_by.first_name} ${media_modified_by.last_name}`;
              }
            } else if (attrName == "(media) $modified_datetime") {
              attrVal = media.modified_datetime;
            } else if (attrName == "(media) $type_name") {
              attrVal = media_type.name;
            } else if (attrName == "(media) $type_id") {
              attrVal = media_type.id;
            } else if (attrName == "(media) $width") {
              attrVal = media.width;
            } else if (attrName == "(media) $height") {
              attrVal = media.height;
            } else if (attrName == "(media) $fps") {
              attrVal = media.fps;
            } else if (attrName == "(media) $num_frames") {
              attrVal = media.num_frames;
            } else if (attrName == "(media) $duration_minutes") {
              if (media.num_frames != null && media.fps != null) {
                attrVal = media.num_frames / media.fps / 60;
              } else {
                attrVal = "";
              }
            } else if (attrName == "(media) $streaming_resolutions") {
              if (media.media_files.streaming != null) {
                var res_list = [];
                for (const media_file of media.media_files.streaming) {
                  res_list.push(
                    `${media_file.resolution[1]}x${media_file.resolution[0]}`
                  );
                }
                attrVal = res_list.join(" ");
              }
            } else if (attrName == "(media) $archive_state") {
              attrVal = media.archive_state;
            }
          } catch (error) {
            attrVal = "ERROR";
          }
          row.push(attrVal);
        }
        for (const uiAttrName of this._relatedSelectedUserAttributes) {
          try {
            // Replace any instance of the delimiter with a space
            var attrName = uiAttrName.split("(media) ")[1];
            var attrVal = media.attributes[attrName];
            if (attrVal != undefined) {
              attrVal = attrVal.toString().replace(/,/g, " ");
              attrVal = attrVal.replace(/\r?\n/g, " ");
              attrVal = attrVal.toString().trim();
            }
            row.push(attrVal);
          } catch (error) {
            row.push("ERROR");
          }
        }
        for (const attrName of this._selectedBuiltInAttributes) {
          try {
            var attrVal = "";
            if (attrName == "$id") {
              attrVal = data.id;
            } else if (attrName == "$elemental_id") {
              attrVal = data.elemental_id;
            } else if (attrName == "$name") {
              attrVal = data.name;
            } else if (attrName == "$parent") {
              attrVal = data.parent;
            } else if (attrName == "$section_id") {
              attrVal = section_ids[0];
            }
            //else if (attrName == "$section_ids") {
            //  attrVal = section_ids.join(" ");
            //}
            else if (attrName == "$section_name") {
              attrVal = section_names[0];
            }
            //else if (attrName == "$section_names") {
            //  attrVal = section_names.join("|");
            //}
            else if (attrName == "$version_id") {
              attrVal = version.id;
            } else if (attrName == "$version_name") {
              attrVal = version.name;
            } else if (attrName == "$media_id") {
              attrVal = media_ids[0];
            } else if (attrName == "$media_ids") {
              attrVal = media_ids.join(" ");
            }
            //else if (attrName == "$media_name") {
            //  attrVal = media_names[0]
            //}
            //else if (attrName == "$media_names") {
            //  attrVal = media_names.join("|");
            //}
            else if (attrName == "$frame") {
              attrVal = data.frame;
            } else if (attrName == "$created_by_id") {
              attrVal = created_by.user;
            } else if (attrName == "$created_by_username") {
              attrVal = created_by.username;
            } else if (attrName == "$created_by_name") {
              attrVal = `${created_by.first_name} ${created_by.last_name}`;
            } else if (attrName == "$created_datetime") {
              attrVal = data.created_datetime;
            } else if (attrName == "$modified_by_id") {
              attrVal = modified_by.user;
            } else if (attrName == "$modified_by_username") {
              attrVal = modified_by.username;
            } else if (attrName == "$modified_by_name") {
              attrVal = `${modified_by.first_name} ${modified_by.last_name}`;
            } else if (attrName == "$modified_datetime") {
              attrVal = data.modified_datetime;
            } else if (attrName == "$type_name") {
              attrVal = entityType.name;
            } else if (attrName == "$type_id") {
              attrVal = entityType.id;
            } else if (attrName == "$localization_ids") {
              attrVal = data.localizations;
            } else if (attrName == "$x") {
              attrVal = data.x;
            } else if (attrName == "$x_pixels") {
              attrVal = data.x * media.width;
            } else if (attrName == "$y") {
              attrVal = data.y;
            } else if (attrName == "$y_pixels") {
              attrVal = data.y * media.height;
            } else if (attrName == "$u") {
              attrVal = data.u;
            } else if (attrName == "$u_pixels") {
              attrVal = data.u * media.width;
            } else if (attrName == "$v") {
              attrVal = data.v;
            } else if (attrName == "$v_pixels") {
              attrVal = data.v * media.height;
            } else if (attrName == "$points") {
              if (Array.isArray(data.points)) {
                attrVal = data.points.join(" ");
              }
            } else if (attrName == "$points_pixels") {
              if (Array.isArray(data.points)) {
                var points_list = [];
                for (const point of data.points) {
                  points_list.push(
                    `(${point[0] * media.width} ${point[1] * media.height})`
                  );
                }
                attrVal = points_list.join(" ");
              }
            } else if (attrName == "$width") {
              attrVal = data.width;
            } else if (attrName == "$width_pixels") {
              attrVal = data.width * media.width;
            } else if (attrName == "$height") {
              attrVal = data.height;
            } else if (attrName == "$height_pixels") {
              attrVal = data.height * media.height;
            } else if (attrName == "$fps") {
              attrVal = data.fps;
            } else if (attrName == "$num_frames") {
              attrVal = data.num_frames;
            } else if (attrName == "$duration_minutes") {
              if (data.num_frames != null && data.fps != null) {
                attrVal = data.num_frames / data.fps / 60;
              }
            } else if (attrName == "$streaming_resolutions") {
              if (data.media_files.streaming != null) {
                var res_list = [];
                for (const media_file of data.media_files.streaming) {
                  res_list.push(
                    `${media_file.resolution[1]}x${media_file.resolution[0]}`
                  );
                }
                attrVal = res_list.join(" ");
              }
            } else if (attrName == "$archive_state") {
              attrVal = data.archive_state;
            } else if (attrName == "$url") {
              let urlParams = "";
              if (this._queryType == "media") {
                attrVal = `${window.parent.location.origin}/${this._projectId}/annotation/${data.id}?`;
                if (section_ids.length > 0) {
                  urlParams += `section=${section_ids[0]}`;
                }
              } else {
                attrVal = `${window.parent.location.origin}/${this._projectId}/annotation/${media.id}?`;
                urlParams = `selected_entity=${data.elemental_id}&selected_type=${entityType.dtype}_${entityType.id}`;
                if (section_ids.length > 0) {
                  urlParams += `&section=${section_ids[0]}`;
                }
                if (data.frame != null) {
                  urlParams += `&frame=${data.frame}`;
                }
                if (version != null) {
                  urlParams += `&version=${version.id}`;
                }
              }
              attrVal += urlParams;
            }

            if (attrVal != undefined) {
              attrVal = attrVal.toString().replace(/,/g, " ");
              attrVal = attrVal.toString().replace(/\n/g, " ");
              attrVal = attrVal.toString().replace(/\r/g, " ");
            }
            row.push(attrVal);
          } catch (error) {
            console.error(error);
            row.push("ERROR");
          }
        }
        for (const attrName of this._selectedUserAttributes) {
          try {
            // Replace any instance of the delimiter with a space
            var attrVal = data.attributes[attrName];
            if (attrVal != undefined) {
              attrVal = attrVal.toString().replace(/,/g, " ");
              attrVal = attrVal.replace(/\r?\n/g, " ");
              attrVal = attrVal.toString().trim();
            }
            row.push(attrVal);
          } catch (error) {
            row.push("ERROR");
          }
        }
        rows.push(row);
      }
    }

    // Note: we don't use encodeURI because it doesn't handle special characters like #
    var csv = rows.map((e) => e.join(",")).join("\n");
    let csvData = new Blob([csv], { type: "text/csv" });
    let csvUrl = URL.createObjectURL(csvData);
    var link = document.createElement("a");
    link.setAttribute("href", csvUrl);
    var filename = this._exportFileNameInput.getValue();
    if (filename == "") {
      filename = "tator_report.csv";
    }
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Uses the current filter settings, grabs the data in a paginated method,
   * and then writes it to a .csv file
   */
  async exportData() {
    this._loadingInterface.displayLoadingScreen(
      `Querying ${this._queryCount} ${this._queryType}...`
    );

    try {
      var paramString = "";
      var dataURL = "";
      var countURL = "";

      var mediaParamString = "";
      var mediaDataURL = `/rest/Medias/${this._projectId}?`;
      var mediaCountURL = `/rest/MediaCount/${this._projectId}?`;

      var mediaFilters = this._mediaFilterGroup.getAttributeCombinatorSpec();
      var metadataFilters =
        this._metadataFilterGroup.getAttributeCombinatorSpec();

      if (mediaFilters != undefined && mediaFilters.operations.length > 0) {
        mediaParamString += `&encoded_search=${btoa(
          JSON.stringify(mediaFilters)
        )}`;
      }
      if (
        metadataFilters != undefined &&
        metadataFilters.operations.length > 0
      ) {
        mediaParamString += `&encoded_related_search=${btoa(
          JSON.stringify(metadataFilters)
        )}`;
      }

      if (this._queryType == "localizations") {
        dataURL = `/rest/Localizations/${this._projectId}?`;
        countURL = `/rest/LocalizationCount/${this._projectId}?`;
        if (
          metadataFilters != undefined &&
          metadataFilters.operations.length > 0
        ) {
          paramString += `&encoded_search=${btoa(
            JSON.stringify(metadataFilters)
          )}`;
        }
        if (mediaFilters != undefined && mediaFilters.operations.length > 0) {
          paramString += `&encoded_related_search=${btoa(
            JSON.stringify(mediaFilters)
          )}`;
        }
      } else if (this._queryType == "states") {
        dataURL = `/rest/States/${this._projectId}?`;
        countURL = `/rest/StateCount/${this._projectId}?`;
        if (
          metadataFilters != undefined &&
          metadataFilters.operations.length > 0
        ) {
          paramString += `&encoded_search=${btoa(
            JSON.stringify(metadataFilters)
          )}`;
        }
        if (mediaFilters != undefined && mediaFilters.operations.length > 0) {
          paramString += `&encoded_related_search=${btoa(
            JSON.stringify(mediaFilters)
          )}`;
        }
      }

      var allData = [];
      var allMediaData = [];
      var pageSize = 10000;

      // Grab the localization/states if requested to do so
      if (this._queryType != "media") {
        while (allData.length < this._queryCount) {
          if (allData.length + pageSize < this._queryCount) {
            this._loadingInterface.displayLoadingScreen(
              `Querying ${this._queryCount} ${this._queryType} (${
                allData.length + 1
              } - ${allData.length + pageSize} entries)`
            );
          } else {
            this._loadingInterface.displayLoadingScreen(
              `Querying ${this._queryCount} ${this._queryType} (${
                allData.length + 1
              } - ${this._queryCount} entries)`
            );

            // At the last page, let's make sure the count isn't changing before grabbing the last page of data
            var response = await fetchCredentials(`${countURL}${paramString}`, {
              method: "GET",
            });
            if (response.status != 200) {
              throw new Error(`Failed to fetch data: ${response.status}`);
            }
            this._queryCount = await response.json();
          }

          var response = await fetchCredentials(
            `${dataURL}${paramString}&start=${allData.length}&stop=${
              allData.length + pageSize
            }`,
            {
              method: "GET",
            }
          );
          if (response.status != 200) {
            throw new Error(`Failed to fetch data: ${response.status}`);
          }
          var data = await response.json();
          allData = allData.concat(data);
        }
      }

      // If we obtained localization/state data, grab the associated media information.
      // Do this by performing PUTs and requested by ID
      // Otherwise, if it's a media query, utilize the search params in the media endpoint
      if (this._queryType == "media") {
        while (allMediaData.length < this._mediaQueryCount) {
          if (allMediaData.length + pageSize < this._mediaQueryCount) {
            this._loadingInterface.displayLoadingScreen(
              `Querying ${this._mediaQueryCount} media (${
                allMediaData.length + 1
              } - ${allMediaData.length + pageSize} entries)`
            );
          } else {
            this._loadingInterface.displayLoadingScreen(
              `Querying ${this._mediaQueryCount} media (${
                allMediaData.length + 1
              } - ${this._mediaQueryCount} entries)`
            );

            // At the last page, let's make sure the count isn't changing before grabbing the last page of data
            var response = await fetchCredentials(
              `${mediaCountURL}${mediaParamString}`,
              {
                method: "GET",
              }
            );
            if (response.status != 200) {
              throw new Error(`Failed to fetch data: ${response.status}`);
            }
            this._queryCount = await response.json();
          }

          var response = await fetchCredentials(
            `${mediaDataURL}${mediaParamString}&start=${
              allMediaData.length
            }&stop=${allMediaData.length + pageSize}`,
            {
              method: "GET",
            }
          );
          if (response.status != 200) {
            throw new Error(`Failed to fetch data: ${response.status}`);
          }
          var data = await response.json();
          allData = allData.concat(data);
          allMediaData = allData;
        }
      } else {
        // First get the media associated with the data
        var mediaIds = new Set();
        for (const data of allData) {
          if (data.hasOwnProperty("media")) {
            if (Array.isArray(data.media)) {
              for (const mediaId of data.media) {
                mediaIds.add(mediaId);
              }
            } else {
              mediaIds.add(data.media);
            }
          }
        }

        // Next, chunk over the media IDs and grab the media data
        // Use the pageSize from earlier
        var mediaIdList = Array.from(mediaIds);
        while (allMediaData.length < mediaIdList.length) {
          var ids = null;
          if (allMediaData.length + pageSize < mediaIdList.length) {
            this._loadingInterface.displayLoadingScreen(
              `Querying ${mediaIdList.length} media (${
                allMediaData.length + 1
              } - ${allMediaData.length + pageSize} entries)`
            );
          } else {
            this._loadingInterface.displayLoadingScreen(
              `Querying ${mediaIdList.length} media (${
                allMediaData.length + 1
              } - ${mediaIdList.length} entries)`
            );
          }
          ids = mediaIdList.slice(
            allMediaData.length,
            allMediaData.length + pageSize
          );
          console.log(`Fetching ${ids.length} media data`);

          var response = await fetchCredentials(`${mediaDataURL}`, {
            method: "PUT",
            body: JSON.stringify({ ids: ids }),
          });
          if (response.status != 200) {
            throw new Error(`Failed to fetch data: ${response.status}`);
          }
          var data = await response.json();
          if (data.length == 0) {
            break;
          }

          allMediaData = allMediaData.concat(data);
        }
      }

      // Finally create the CSV
      await this.createCSV(allData, allMediaData);
    } catch (error) {
      console.error(error);
    }

    this._loadingInterface.hideLoadingScreen();
  }

  //
  // UI Methods - Initialization
  //

  /**
   * @precondition this._mediaFilterData, this._localizationFilterData, this._stateFilterData, this._stateAndLocalizationFilterData are initialized
   * @precondition this._queryType selected to "localizations", "states", "media"
   */
  initializeFilters() {
    this._mediaFilterDisplay =
      this._shadow.getElementById("mediaFilterDisplay");
    this._mediaFilterGroup = this._shadow.getElementById("mediaFilterGroup");

    this._mediaFilterGroup.clear();

    var mediaTypes = this._mediaFilterData.getEntityTypes();
    if (this._queryType == "media") {
      var selectedTypeIDs = this.getSelectedMediaTypes();
      var filteredTypes = [];
      for (const type of mediaTypes) {
        if (selectedTypeIDs.includes(type.id)) {
          filteredTypes.push(type);
        }
      }
      this._mediaFilterGroup.setEntityTypes(filteredTypes);
    } else {
      this._mediaFilterGroup.setEntityTypes(mediaTypes);
    }

    this._mediaFilterDisplay.style.display = "none";
    this._mediaFilterGroup.addEventListener("change", () => {
      var spec = this._mediaFilterGroup.getAttributeCombinatorSpec();
      var div = this._shadow.getElementById("pageMediaFilters_editHeader");
      if (spec.operations.length > 0) {
        this._mediaFilterDisplay.style.display = "flex";
        this._mediaFilterDisplay.setDisplay("Media Query", spec, true);
        div.innerHTML = "Applying selected media filters.";
      } else {
        this._mediaFilterDisplay.style.display = "none";
        div.innerHTML = `<span class="text-dark-gray">No media filters.</span>`;
      }
    });

    this._metadataFilterDisplay = this._shadow.getElementById(
      "metadataFilterDisplay"
    );
    this._metadataFilterGroup = this._shadow.getElementById(
      "metadataFilterGroup"
    );

    this._metadataFilterGroup.clear();
    if (this._queryType == "localizations") {
      var entityTypes = this._localizationFilterData.getEntityTypes();
      var selectedTypeIDs = this.getSelectedLocalizationTypes();
      var filteredTypes = [];
      for (const type of entityTypes) {
        if (selectedTypeIDs.includes(type.id)) {
          filteredTypes.push(type);
        }
      }
      this._metadataFilterGroup.setEntityTypes(filteredTypes);
    } else if (this._queryType == "states") {
      var entityTypes = this._stateFilterData.getEntityTypes();
      var selectedTypeIDs = this.getSelectedStateTypes();
      var filteredTypes = [];
      for (const type of entityTypes) {
        if (selectedTypeIDs.includes(type.id)) {
          filteredTypes.push(type);
        }
      }
      this._metadataFilterGroup.setEntityTypes(filteredTypes);
    } else {
      this._metadataFilterGroup.setEntityTypes(
        this._stateAndLocalizationFilterData.getEntityTypes()
      );
    }
    this._metadataFilterDisplay.style.display = "none";

    this._metadataFilterGroup.addEventListener("change", () => {
      var spec = this._metadataFilterGroup.getAttributeCombinatorSpec();
      var div = this._shadow.getElementById("pageMetadataFilters_editHeader");
      if (spec.operations.length > 0) {
        this._metadataFilterDisplay.style.display = "flex";
        if (this._queryType == "localizations") {
          this._metadataFilterDisplay.setDisplay(
            "Localization Query",
            spec,
            true
          );
          div.innerHTML = `Applying selected localization filters.`;
        } else {
          this._metadataFilterDisplay.setDisplay("State Query", spec, true);
          div.innerHTML = `Applying selected state filters.`;
        }
      } else {
        this._metadataFilterDisplay.style.display = "none";
        div.innerHTML = `<span class="text-dark-gray">No metadata filters.</span>`;
      }
    });

    if (this._queryType == "media") {
      var selectedTypeIDs = this.getSelectedMediaTypes();
      if (selectedTypeIDs.length > 0) {
        this._mediaFilterGroup.addSelectedTypes(selectedTypeIDs);
        this._mediaFilterGroup.forceToAND();
      } else {
        this._mediaFilterGroup.allowANDOR();
      }
      this._metadataFilterGroup.allowANDOR();
    } else if (this._queryType == "localizations") {
      var selectedTypeIDs = this.getSelectedLocalizationTypes();
      if (selectedTypeIDs.length > 0) {
        this._metadataFilterGroup.addSelectedTypes(selectedTypeIDs);
        this._metadataFilterGroup.forceToAND();
      } else {
        this._metadataFilterGroup.allowANDOR();
      }
      this._mediaFilterGroup.allowANDOR();
    } else if (this._queryType == "states") {
      var selectedTypeIDs = this.getSelectedStateTypes();
      if (selectedTypeIDs.length > 0) {
        this._metadataFilterGroup.addSelectedTypes(selectedTypeIDs);
        this._metadataFilterGroup.forceToAND();
      } else {
        this._metadataFilterGroup.allowANDOR();
      }
      this._mediaFilterGroup.allowANDOR();
    }

    if (this._selectedSectionIds.length > 0) {
      var sectionNames = [];
      for (const section of this._utils._sections) {
        if (this._selectedSectionIds.includes(section.id)) {
          sectionNames.push(`${section.name} (ID: ${section.id})`);
        }
      }
      this._mediaFilterGroup.addSelectedSections(sectionNames);
      this._mediaFilterGroup.forceToAND();
    }

    if (this._selectedMediaIds.length > 0) {
      this._mediaFilterGroup.addSelectedMediaIds(this._selectedMediaIds);
      this._mediaFilterGroup.forceToAND();
    }
  }

  initializeQueryTypePage() {
    this._mediaTypeCheckboxes = [];
    this._localizationTypeCheckboxes = [];
    this._stateTypeCheckboxes = [];
    this._mediaTypeCheckboxesToggle = false;
    this._locTypeCheckboxesToggle = false;
    this._stateTypeCheckboxesToggle = false;

    //
    // Setup the media type list
    //
    var div = this._shadow.getElementById("pageQueryType_mediaTypesList");
    div.innerHTML = "";

    var toggleAllMediaButton = document.createElement("button");
    toggleAllMediaButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center rounded-1 f2 text-gray entity__button box-border my-2 px-2"
    );
    toggleAllMediaButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All</span>
    `;
    div.appendChild(toggleAllMediaButton);

    toggleAllMediaButton.addEventListener("click", () => {
      toggleAllMediaButton.blur();
      this._mediaTypeCheckboxesToggle = !this._mediaTypeCheckboxesToggle;
      this._mediaTypeCheckboxes.forEach((elem) => {
        elem._checked = this._mediaTypeCheckboxesToggle;
      });

      var button = this._shadow.getElementById("pageQueryType_mediaButton");
      if (this._mediaTypeCheckboxesToggle == false) {
        button.setAttribute("disabled", "");
      } else {
        button.removeAttribute("disabled");
      }
    });

    var elementTexts = [];
    this._utils._mediaTypes.forEach((typeElem) => {
      elementTexts.push(
        `<span class="text-gray mr-1 f3">${typeElem.dtype}:</span>${typeElem.name} <span class="text-dark-gray f3">(ID: ${typeElem.id})</span>`
      );
    });
    elementTexts.sort();
    elementTexts.forEach((html) => {
      var elem = this.makeCheckbox("");
      elem._input.style.marginLeft = "0px";
      elem.styleSpan.innerHTML = html;
      elem._checked = false;
      div.appendChild(elem);
      this._mediaTypeCheckboxes.push(elem);

      elem.addEventListener("change", () => {
        var list = this.getSelectedMediaTypes();
        var button = this._shadow.getElementById("pageQueryType_mediaButton");
        if (list.length == 0) {
          button.setAttribute("disabled", "");
        } else {
          button.removeAttribute("disabled");
        }
      });
    });

    //
    // Setup the localization type list
    //
    var div = this._shadow.getElementById(
      "pageQueryType_localizationTypesList"
    );
    div.innerHTML = "";

    var toggleAllLocButton = document.createElement("button");
    toggleAllLocButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center rounded-1 f2 text-gray entity__button box-border my-2 px-2"
    );
    toggleAllLocButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All</span>
    `;
    div.appendChild(toggleAllLocButton);

    toggleAllLocButton.addEventListener("click", () => {
      toggleAllLocButton.blur();
      this._locTypeCheckboxesToggle = !this._locTypeCheckboxesToggle;
      this._localizationTypeCheckboxes.forEach((elem) => {
        elem._checked = this._locTypeCheckboxesToggle;
      });

      var button = this._shadow.getElementById(
        "pageQueryType_localizationsButton"
      );
      if (this._locTypeCheckboxesToggle == false) {
        button.setAttribute("disabled", "");
      } else {
        button.removeAttribute("disabled");
      }
    });

    var elementTexts = [];
    this._utils._localizationTypes.forEach((typeElem) => {
      elementTexts.push(
        `<span class="text-gray mr-1 f3">${typeElem.dtype}:</span>${typeElem.name} <span class="text-dark-gray f3">(ID: ${typeElem.id})</span>`
      );
    });
    elementTexts.sort();
    elementTexts.forEach((html) => {
      var elem = this.makeCheckbox("");
      elem._input.style.marginLeft = "0px";
      elem.styleSpan.innerHTML = html;
      elem._checked = false;
      div.appendChild(elem);
      this._localizationTypeCheckboxes.push(elem);

      elem.addEventListener("change", () => {
        var list = this.getSelectedLocalizationTypes();
        var button = this._shadow.getElementById(
          "pageQueryType_localizationsButton"
        );
        if (list.length == 0) {
          button.setAttribute("disabled", "");
        } else {
          button.removeAttribute("disabled");
        }
      });
    });

    //
    // Setup the state type list
    //
    var div = this._shadow.getElementById("pageQueryType_statesTypesList");
    div.innerHTML = "";

    var toggleAllStatesButton = document.createElement("button");
    toggleAllStatesButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center rounded-1 f2 text-gray entity__button box-border my-2 px-2"
    );
    toggleAllStatesButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All</span>
    `;
    div.appendChild(toggleAllStatesButton);

    toggleAllStatesButton.addEventListener("click", () => {
      toggleAllStatesButton.blur();
      this._stateTypeCheckboxesToggle = !this._stateTypeCheckboxesToggle;
      this._stateTypeCheckboxes.forEach((elem) => {
        elem._checked = this._stateTypeCheckboxesToggle;
      });

      var button = this._shadow.getElementById("pageQueryType_statesButton");
      if (this._stateTypeCheckboxesToggle == false) {
        button.setAttribute("disabled", "");
      } else {
        button.removeAttribute("disabled");
      }
    });

    var elementTexts = [];
    this._utils._stateTypes.forEach((typeElem) => {
      elementTexts.push(
        `<span class="text-gray mr-1 f3">${typeElem.association.toLowerCase()} ${
          typeElem.dtype
        }:</span>${typeElem.name} <span class="text-dark-gray f3">(ID: ${
          typeElem.id
        })</span>`
      );
    });
    elementTexts.sort();
    elementTexts.forEach((html) => {
      var elem = this.makeCheckbox("");
      elem._input.style.marginLeft = "0px";
      elem.styleSpan.innerHTML = html;
      elem._checked = false;
      div.appendChild(elem);
      this._stateTypeCheckboxes.push(elem);

      elem.addEventListener("change", () => {
        var list = this.getSelectedStateTypes();
        var button = this._shadow.getElementById("pageQueryType_statesButton");
        if (list.length == 0) {
          button.setAttribute("disabled", "");
        } else {
          button.removeAttribute("disabled");
        }
      });
    });
  }

  initializePageButtons() {
    this._pageQueryType_edit = this._shadow.getElementById(
      "pageQueryType_editButton"
    );
    this._pageQueryType_edit.addEventListener("click", () => {
      this._pageQueryType_edit.blur();
      this.switchQueryPage("queryType");
    });

    this._pageMediaFilters_edit = this._shadow.getElementById(
      "pageMediaFilters_editButton"
    );
    this._pageMediaFilters_edit.addEventListener("click", () => {
      this._pageMediaFilters_edit.blur();
      this.switchQueryPage("mediaFilters");
    });

    this._pageMetadataFilters_edit = this._shadow.getElementById(
      "pageMetadataFilters_editButton"
    );
    this._pageMetadataFilters_edit.addEventListener("click", () => {
      this._pageMetadataFilters_edit.blur();
      this.switchQueryPage("metadataFilters");
    });

    this._pageQueryType_mediaButton = this._shadow.getElementById(
      "pageQueryType_mediaButton"
    );
    this._pageQueryType_mediaButton.addEventListener("click", () => {
      this._pageQueryType_mediaButton.blur();
      var mediaTypes = this.getSelectedMediaTypes();
      this._shadow.getElementById(
        "pageQueryType_editHeader"
      ).innerHTML = `Exporting ${mediaTypes.length} media types.`;
      this._queryType = "media";
      this.initializeFilters();
      this.switchQueryPage("mediaFilters");
    });

    this._pageQueryType_localizationsButton = this._shadow.getElementById(
      "pageQueryType_localizationsButton"
    );
    this._pageQueryType_localizationsButton.addEventListener("click", () => {
      this._pageQueryType_localizationsButton.blur();
      var locTypes = this.getSelectedLocalizationTypes();
      this._shadow.getElementById(
        "pageQueryType_editHeader"
      ).innerHTML = `Exporting ${locTypes.length} localization types.`;
      this._queryType = "localizations";
      this.initializeFilters();
      this.switchQueryPage("mediaFilters");
    });

    this._pageQueryType_statesButton = this._shadow.getElementById(
      "pageQueryType_statesButton"
    );
    this._pageQueryType_statesButton.addEventListener("click", () => {
      this._pageQueryType_statesButton.blur();
      var stateTypes = this.getSelectedStateTypes();
      this._shadow.getElementById(
        "pageQueryType_editHeader"
      ).innerHTML = `Exporting ${stateTypes.length} state types.`;
      this._queryType = "states";
      this.initializeFilters();
      this.switchQueryPage("mediaFilters");
    });

    this._pageMediaFilters_apply = this._shadow.getElementById(
      "pageMediaFilters_applyButton"
    );
    this._pageMediaFilters_apply.addEventListener("click", () => {
      this._pageMediaFilters_apply.blur();
      this.switchQueryPage("metadataFilters");
    });

    this._pageMetadataFilters_apply = this._shadow.getElementById(
      "pageMetadataFilters_applyButton"
    );
    this._pageMetadataFilters_apply.addEventListener("click", () => {
      this._pageMetadataFilters_apply.blur();
      this.makeAttributeSections();
      this.switchQueryPage("queryData");

      this._currentQueryID += 1;
      this.updateQueryPage(this._currentQueryID).then(() => {
        this.updateQueryPageResults();
      });
    });
  }

  initializeExportPage() {
    this._dimmerDiv = this._shadow.getElementById("dimmer");

    this._exportReportPage = this._shadow.getElementById("exportReportPage");

    this._exportFileNameInput = this._shadow.getElementById("exportFileName");
    this._exportFileNameInput._input.classList.remove("col-8");
    this._exportFileNameInput._input.classList.add("flex-grow");
    this._exportFileNameInput._input.classList.add("text-gray");
    this._exportFileNameInput._name.classList.add("mr-3");
    this._exportFileNameInput._name.classList.add("h3");
    this._exportFileNameInput._name.classList.add("text-white");
    this._exportFileNameInput.setValue("tator_data.csv");

    this._exportDataButton = this._shadow.getElementById("exportDataButton");
    this._exportDataButton.addEventListener("click", () => {
      this._exportDataButton.blur();
      this.exportData();
    });

    this._exportPageMainTab = this._shadow.getElementById("exportPage_MainTab");
    this._exportPageMainTab.style.backgroundColor = "#151b28";

    this._exportPageRelatedTab = this._shadow.getElementById(
      "exportPage_RelatedTab"
    );
    this._exportPageRelatedTab.style.backgroundColor = "#151b28";

    this._exportPageMainTab.addEventListener("click", () => {
      this._exportPageMainTab.blur();
      this._exportPageMainTab.classList.add("active");
      this._exportPageRelatedTab.classList.remove("active");
      var div = this._shadow.getElementById("typeAttributes");
      div.style.display = "flex";
      var div = this._shadow.getElementById("typePageSelect");
      div.style.display = "flex";
      var div = this._shadow.getElementById("relatedTypeAttributes");
      div.style.display = "none";
      var div = this._shadow.getElementById("relatedTypePageSelect");
      div.style.display = "none";
    });
    this._exportPageRelatedTab.addEventListener("click", () => {
      this._exportPageRelatedTab.blur();
      this._exportPageMainTab.classList.remove("active");
      this._exportPageRelatedTab.classList.add("active");
      var div = this._shadow.getElementById("typeAttributes");
      div.style.display = "none";
      var div = this._shadow.getElementById("typePageSelect");
      div.style.display = "none";
      var div = this._shadow.getElementById("relatedTypeAttributes");
      div.style.display = "flex";
      var div = this._shadow.getElementById("relatedTypePageSelect");
      div.style.display = "flex";
    });
  }

  //
  // UI Methods
  //

  /**
   * @param {string} "report"
   */
  switchExportPage(page) {
    if (page == "report") {
      this._exportReportPage.style.display = "flex";
    }
  }

  /**
   * @return {array} List of IDs of media types selected for export by the user
   */
  getSelectedMediaTypes() {
    var selectedTypes = [];
    for (const checkbox of this._mediaTypeCheckboxes) {
      if (checkbox.getChecked()) {
        selectedTypes.push(
          parseInt(checkbox.styleSpan.innerHTML.split("(ID: ")[1].split(")")[0])
        );
      }
    }
    return selectedTypes;
  }

  /**
   * @return {array} List of IDs of localization types selected for export by the user
   */
  getSelectedLocalizationTypes() {
    var selectedTypes = [];
    for (const checkbox of this._localizationTypeCheckboxes) {
      if (checkbox.getChecked()) {
        selectedTypes.push(
          parseInt(checkbox.styleSpan.innerHTML.split("(ID: ")[1].split(")")[0])
        );
      }
    }
    return selectedTypes;
  }

  /**
   * @return {array} List of IDs of state types selected for export by the user
   */
  getSelectedStateTypes() {
    var selectedTypes = [];
    for (const checkbox of this._stateTypeCheckboxes) {
      if (checkbox.getChecked()) {
        selectedTypes.push(
          parseInt(checkbox.styleSpan.innerHTML.split("(ID: ")[1].split(")")[0])
        );
      }
    }
    return selectedTypes;
  }

  /**
   * @postcondition Updates the filter result counts and enables the export button
   */
  updateQueryPageResults() {
    var div = this._shadow.getElementById("pageQueryData_resultCount");
    if (this._queryCountError) {
      div.innerHTML = `<div class="text-red">Error</div>`;
    } else {
      if (this._queryType == "media") {
        div.innerHTML = `<div class="text-white">${this._queryCount}</div><div class="d-flex h3 text-gray">${this._queryType}</div>`;
      } else {
        div.innerHTML = `
          <div class="text-white d-flex">${this._queryCount}</div><div class="d-flex h3 text-gray">${this._queryType}</div>
          <div class="text-white d-flex mt-1 f2 text-dark-gray">${this._mediaQueryCount} associated media</div>
          `;
      }
    }

    if (this._queryCountError || this._queryCount == 0) {
      this._exportDataButton.setAttribute("disabled", "");
    } else {
      this._exportDataButton.removeAttribute("disabled", "");
    }
  }

  /**
   * Updates the entity type button tabs in the columnn selection area
   * @param pageType {string} "main" | "relatedMedia"
   */
  updateEntityTypeButtonTabs(pageType) {
    var pageButtons = null;
    var selectedBuiltInAttributes = null;
    var selectedUserAttributes = null;
    var pageButtonNames = null;
    var attributesByType = null;

    if (pageType == "main") {
      pageButtons = this._typePageButtons;
      selectedBuiltInAttributes = this._selectedBuiltInAttributes;
      selectedUserAttributes = this._selectedUserAttributes;
      pageButtonNames = this._typePageButtonNames;
      attributesByType = this._attributesByType;
    } else if (pageType == "relatedMedia") {
      pageButtons = this._relatedTypePageButtons;
      selectedBuiltInAttributes = this._relatedSelectedBuiltInAttributes;
      selectedUserAttributes = this._relatedSelectedUserAttributes;
      pageButtonNames = this._relatedTypePageButtonNames;
      attributesByType = this._relatedAttributesByType;
    }

    for (const id in pageButtons) {
      const button = pageButtons[id];
      var selectedCount = 0;
      for (const attr of selectedBuiltInAttributes) {
        if (attributesByType[id].includes(attr)) {
          selectedCount++;
        }
      }
      for (const attr of selectedUserAttributes) {
        if (attributesByType[id].includes(attr)) {
          selectedCount++;
        }
      }
      const allCount = attributesByType[id].length;
      button.innerHTML = `
      <div class="d-flex flex-justify-between flex-items-center flex-grow pt-1">
        <div class="d-flex flex-column mb-1"><div class="d-flex text-semibold">${pageButtonNames[id]}</div><div class="d-flex f3">${selectedCount} of ${allCount} attributes selected</div></div>
        <svg class="no-fill" width="16" height="16" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" /></svg>
      </div>
      `;
    }
  }

  /**
   * Updates the column count label in the export page
   */
  updateColumnCount() {
    var selectCount = this._shadow.getElementById("columnCount");
    selectCount.textContent = `${
      this._selectedUserAttributes.length +
      this._selectedBuiltInAttributes.length +
      this._relatedSelectedUserAttributes.length +
      this._relatedSelectedBuiltInAttributes.length
    } columns selected`;
  }

  /**
   * @param name {string} User attribute name to select
   * @param selected {bool} True if the attribute is selected. False otherwise.
   * @param pageType {string} "main" | "relatedMedia"
   * @precondition All the user attribute UI elements must have be created
   */
  selectUserAttribute(name, selected, pageType) {
    var selectLabel = this._shadow.getElementById(`_selected_${name}`);

    var checkboxes = null;
    var selectedAttributes = null;
    if (pageType == "main") {
      checkboxes = this._userAttributeCheckboxes;
      selectedAttributes = this._selectedUserAttributes;
    } else if (pageType == "relatedMedia") {
      checkboxes = this._relatedUserAttributeCheckboxes;
      selectedAttributes = this._relatedSelectedUserAttributes;
    }

    if (selectedAttributes.includes(name) && !selected) {
      // Deselect attribute
      for (const checkbox of checkboxes[name]) {
        checkbox._checked = false;
      }
      var idx = selectedAttributes.indexOf(name);
      selectedAttributes.splice(idx, 1);
      selectLabel.style.display = "none";
    } else if (!selectedAttributes.includes(name) && selected) {
      // Select attribute
      for (const checkbox of checkboxes[name]) {
        checkbox._checked = true;
      }
      selectedAttributes.push(name);
      selectLabel.style.display = "block";
    }

    this.updateColumnCount();
    this.updateEntityTypeButtonTabs(pageType);
  }

  /**
   * @param name {string} Built-in attribute name to select
   * @param selected {bool} True if the attribute is selected. False otherwise.
   * @precondition All the built-in attribute UI elements must have be created
   * @param pageType {string} "main" | "relatedMedia"
   */
  selectBuiltInAttribute(name, selected, pageType) {
    var selectLabel = this._shadow.getElementById(`_selected_${name}`);

    var checkboxes = null;
    var selectedAttributes = null;
    if (pageType == "main") {
      checkboxes = this._builtInAttributeCheckboxes;
      selectedAttributes = this._selectedBuiltInAttributes;
    } else if (pageType == "relatedMedia") {
      checkboxes = this._relatedBuiltInAttributeCheckboxes;
      selectedAttributes = this._relatedSelectedBuiltInAttributes;
    }

    if (selectedAttributes.includes(name) && !selected) {
      // Deselect attribute
      for (const checkbox of checkboxes[name]) {
        checkbox._checked = false;
      }
      var idx = selectedAttributes.indexOf(name);
      selectedAttributes.splice(idx, 1);
      selectLabel.style.display = "none";
    } else if (!selectedAttributes.includes(name) && selected) {
      // Select attribute
      for (const checkbox of checkboxes[name]) {
        checkbox._checked = true;
      }
      selectedAttributes.push(name);
      selectLabel.style.display = "block";
    }

    this.updateColumnCount();
    this.updateEntityTypeButtonTabs(pageType);
  }

  /**
   * @param name {string} User attribute name
   * @param checkbox {checkbox element} Corresponding checkbox UI element
   * @param entityType {Tator.EntityType} Localization associated with the attribute name checkbox
   * @param pageType {string} "main" | "relatedMedia"
   */
  addToUserCheckboxes(name, checkbox, entityType, pageType) {
    const entityKey = `${entityType.dtype}_${entityType.id}`;

    var checkboxes = null;
    var userAttributes = null;
    var hiddenAttributes = null;
    if (pageType == "main") {
      checkboxes = this._userAttributeCheckboxes;
      userAttributes = this._userEntityTypeAttributes;
      hiddenAttributes = this._hiddenEntityTypeAttributes;
    } else if (pageType == "relatedMedia") {
      checkboxes = this._relatedUserAttributeCheckboxes;
      userAttributes = this._relatedUserEntityTypeAttributes;
      hiddenAttributes = this._relatedHiddenEntityTypeAttributes;
    }

    if (!checkboxes.hasOwnProperty(name)) {
      checkboxes[name] = [];
    }
    checkboxes[name].push(checkbox);
    userAttributes[entityKey].push(name);

    for (const attrType of entityType.attribute_types) {
      if (attrType.name == name) {
        if (attrType.order < 0 || attrType.visible == false) {
          hiddenAttributes[entityKey].push(name);
        }
        break;
      }
    }

    checkbox.addEventListener("change", () => {
      this.selectUserAttribute(name, checkbox.getChecked(), pageType);
    });
  }

  /**
   * @param name {string} Built-in attribute name
   * @param checkbox {checkbox element} Corresponding checkbox UI element
   * @param entityType {Tator.EntityType} Localization associated with the attribute name checkbox
   * @param pageType {string} "main" | "relatedMedia"
   */
  addToBuiltinCheckboxes(name, checkbox, entityType, pageType) {
    const entityKey = `${entityType.dtype}_${entityType.id}`;

    var checkboxes = null;
    var builtInAttributes = null;
    if (pageType == "main") {
      checkboxes = this._builtInAttributeCheckboxes;
      builtInAttributes = this._builtInEntityTypeAttributes;
    } else if (pageType == "relatedMedia") {
      checkboxes = this._relatedBuiltInAttributeCheckboxes;
      builtInAttributes = this._relatedBuiltInEntityTypeAttributes;
    }

    if (!checkboxes.hasOwnProperty(name)) {
      checkboxes[name] = [];
    }
    checkboxes[name].push(checkbox);
    builtInAttributes[entityKey].push(name);

    checkbox.addEventListener("change", () => {
      this.selectBuiltInAttribute(name, checkbox.getChecked(), pageType);
    });
  }

  /**
   * Creates the tabs and attribute pages for each of the main types
   * Call this in makeAttributeSections() only
   */
  updateMainTypePage() {
    var parentDiv = this._shadow.getElementById("typePageSelect");
    while (parentDiv.firstChild) {
      parentDiv.removeChild(parentDiv.firstChild);
    }

    var builtInButton = document.createElement("button");
    builtInButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center rounded-1 f2 text-gray entity__button box-border my-1 px-2"
    );
    builtInButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All Built-In Attributes</span>
    `;
    builtInButton.style.width = "280px";
    parentDiv.appendChild(builtInButton);

    builtInButton.addEventListener("click", () => {
      builtInButton.blur();
      this._toggleAllBuiltInAttributesState =
        !this._toggleAllBuiltInAttributesState;
      for (const attrName of this._sortedBuiltInAttributeNames) {
        this.selectBuiltInAttribute(
          attrName,
          this._toggleAllBuiltInAttributesState,
          "main"
        );
      }
      for (const id in this._pageStatus) {
        this._pageStatus[id].builtInAttributesToggle =
          this._toggleAllBuiltInAttributesState;
      }
    });

    var userButton = document.createElement("button");
    userButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center rounded-1 f2 text-gray entity__button box-border my-1 mb-3 px-2"
    );
    userButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All Custom Attributes</span>
    `;
    userButton.style.width = "280px";
    parentDiv.appendChild(userButton);

    userButton.addEventListener("click", () => {
      userButton.blur();
      this._toggleAllUserAttributesState = !this._toggleAllUserAttributesState;
      for (const attrName of this._sortedUserAttributeNames) {
        this.selectUserAttribute(
          attrName,
          this._toggleAllUserAttributesState,
          "main"
        );
      }
      for (const id in this._pageStatus) {
        this._pageStatus[id].hiddenAttributesToggle =
          this._toggleAllUserAttributesState;
        this._pageStatus[id].visibleAttributesToggle =
          this._toggleAllUserAttributesState;
      }
    });

    for (const name of this._sortedTypePageButtonNames) {
      for (const id in this._typePageButtonNames) {
        if (this._typePageButtonNames[id] == name) {
          var btn = document.createElement("button");
          btn.setAttribute("class", "tab-btn px-3 f2");
          btn.style.width = "380px";
          btn.style.height = "50px";
          btn.style.borderRadius = "0px";
          btn.style.marginLeft = "0px";
          btn.style.justifyContent = "space-between";
          btn.innerHTML = this._typePageButtonNames[id];
          parentDiv.appendChild(btn);
          this._typePageButtons[id] = btn;
          this._userEntityTypeAttributes[id] = [];
          this._hiddenEntityTypeAttributes[id] = [];
          this._builtInEntityTypeAttributes[id] = [];

          if (this._firstPageId == null) {
            this._firstPageId = id;
          }
        }
      }
    }

    // Create a page for each entity type.
    // By default hide them, and use another function to display them.
    var parentDiv = this._shadow.getElementById("typeAttributes");
    while (parentDiv.firstChild) {
      parentDiv.removeChild(parentDiv.firstChild);
    }

    this._typePages = {};
    for (const [id, entityType] of Object.entries(this._entityTypeMap)) {
      var pageDiv = this.makeAttributePage(parentDiv, entityType, "main");
      this._typePages[id] = pageDiv;
      pageDiv.style.display = "none";
    }

    for (const [id, button] of Object.entries(this._typePageButtons)) {
      button.addEventListener("click", () => {
        button.blur();
        for (const [id2, pageDiv] of Object.entries(this._typePages)) {
          if (id2 == id) {
            pageDiv.style.display = "flex";
            this._typePageButtons[id2].classList.add("active");
          } else {
            pageDiv.style.display = "none";
            this._typePageButtons[id2].classList.remove("active");
          }
        }
      });
    }
  }

  /**
   * Creates the tabs and attribute pages for each of the related types
   * Call this in makeAttributeSections() only
   */
  updateRelatedTypePage() {
    var parentDiv = this._shadow.getElementById("relatedTypePageSelect");
    while (parentDiv.firstChild) {
      parentDiv.removeChild(parentDiv.firstChild);
    }

    var builtInButton = document.createElement("button");
    builtInButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center rounded-1 f2 text-gray entity__button box-border my-1 px-2"
    );
    builtInButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All Built-In Attributes</span>
    `;
    builtInButton.style.width = "280px";
    parentDiv.appendChild(builtInButton);

    builtInButton.addEventListener("click", () => {
      builtInButton.blur();
      this._relatedToggleAllBuiltInAttributesState =
        !this._relatedToggleAllBuiltInAttributesState;
      for (const attrName of this._relatedSortedBuiltInAttributeNames) {
        this.selectBuiltInAttribute(
          attrName,
          this._relatedToggleAllBuiltInAttributesState,
          "relatedMedia"
        );
      }
      for (const id in this._pageStatus) {
        this._pageStatus[id].builtInAttributesToggle =
          this._relatedToggleAllBuiltInAttributesState;
      }
    });

    var userButton = document.createElement("button");
    userButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center rounded-1 f2 text-gray entity__button box-border my-1 mb-3 px-2"
    );
    userButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All Custom Attributes</span>
    `;
    userButton.style.width = "280px";
    parentDiv.appendChild(userButton);

    userButton.addEventListener("click", () => {
      userButton.blur();
      this._relatedToggleAllUserAttributesState =
        !this._relatedToggleAllUserAttributesState;
      for (const attrName of this._relatedSortedUserAttributeNames) {
        this.selectUserAttribute(
          attrName,
          this._relatedToggleAllUserAttributesState,
          "relatedMedia"
        );
      }
      for (const id in this._pageStatus) {
        this._pageStatus[id].hiddenAttributesToggle =
          this._relatedToggleAllUserAttributesState;
        this._pageStatus[id].visibleAttributesToggle =
          this._relatedToggleAllUserAttributesState;
      }
    });

    for (const name of this._relatedSortedTypePageButtonNames) {
      for (const id in this._relatedTypePageButtonNames) {
        if (this._relatedTypePageButtonNames[id] == name) {
          var btn = document.createElement("button");
          btn.setAttribute("class", "tab-btn px-3 f2");
          btn.style.width = "380px";
          btn.style.height = "50px";
          btn.style.borderRadius = "0px";
          btn.style.marginLeft = "0px";
          btn.style.justifyContent = "space-between";
          btn.innerHTML = this._relatedTypePageButtonNames[id];
          parentDiv.appendChild(btn);
          this._relatedTypePageButtons[id] = btn;
          this._relatedUserEntityTypeAttributes[id] = [];
          this._relatedHiddenEntityTypeAttributes[id] = [];
          this._relatedBuiltInEntityTypeAttributes[id] = [];

          if (this._relatedFirstPageId == null) {
            this._relatedFirstPageId = id;
          }
        }
      }
    }

    // Create a page for each entity type.
    // By default hide them, and use another function to display them.
    var parentDiv = this._shadow.getElementById("relatedTypeAttributes");
    while (parentDiv.firstChild) {
      parentDiv.removeChild(parentDiv.firstChild);
    }

    this._relatedTypePages = {};
    for (const [id, entityType] of Object.entries(this._relatedEntityTypeMap)) {
      var pageDiv = this.makeAttributePage(
        parentDiv,
        entityType,
        "relatedMedia"
      );
      this._relatedTypePages[id] = pageDiv;
      pageDiv.style.display = "none";
    }

    for (const [id, button] of Object.entries(this._relatedTypePageButtons)) {
      button.addEventListener("click", () => {
        button.blur();
        for (const [id2, pageDiv] of Object.entries(this._relatedTypePages)) {
          if (id2 == id) {
            pageDiv.style.display = "flex";
            this._relatedTypePageButtons[id2].classList.add("active");
          } else {
            pageDiv.style.display = "none";
            this._relatedTypePageButtons[id2].classList.remove("active");
          }
        }
      });
    }
  }

  /**
   * Makes the different attribute/CSV column sections for each entity type.
   * Each type will be a page that will be hidden based on the given selected types.
   * There will be selectable button tabs.
   */
  makeAttributeSections() {
    // Split out the user and built-in attribute names because it's possible
    // that the user and built in attributes have colliding names.
    this._selectedUserAttributes = [];
    this._selectedBuiltInAttributes = [];
    this._userAttributeCheckboxes = {};
    this._userEntityTypeAttributes = {};
    this._hiddenEntityTypeAttributes = {};
    this._builtInAttributeCheckboxes = {};
    this._builtInEntityTypeAttributes = {};
    this._sortedUserAttributeNames = [];
    this._sortedBuiltInAttributeNames = [];
    this._toggleAllBuiltInAttributesState = true;
    this._toggleAllUserAttributesState = true;

    this._typePageButtons = {}; // Key'd by elemental_id, Contains the tab button for each of the types
    this._typePageButtonNames = {}; // Key'd by elemental_id, Contains the name of associated with each type page
    this._sortedTypePageButtonNames = []; // Sorted list of type page button names
    this._entityTypeMap = {}; // Key'd by elemental_id
    this._attributesByType = {};

    this._relatedSelectedUserAttributes = [];
    this._relatedSelectedBuiltInAttributes = [];
    this._relatedUserAttributeCheckboxes = {};
    this._relatedUserEntityTypeAttributes = {};
    this._relatedHiddenEntityTypeAttributes = {};
    this._relatedBuiltInAttributeCheckboxes = {};
    this._relatedBuiltInEntityTypeAttributes = {};
    this._relatedSortedUserAttributeNames = [];
    this._relatedSortedBuiltInAttributeNames = [];
    this._relatedToggleAllBuiltInAttributesState = true;
    this._relatedToggleAllUserAttributesState = true;
    this._relatedTypePageButtons = {};
    this._relatedTypePageButtonNames = {};
    this._relatedSortedTypePageButtonNames = [];
    this._relatedEntityTypeMap = {};
    this._relatedAttributesByType = {};

    this._pageStatus = {};
    this._firstPageId = null;

    // Setup the type page button names
    if (this._queryType == "media") {
      var selectedTypeIDs = this.getSelectedMediaTypes();

      for (const entityType of this._utils._mediaTypes) {
        if (selectedTypeIDs.includes(entityType.id)) {
          this._entityTypeMap[`${entityType.dtype}_${entityType.id}`] =
            entityType;
          this._typePageButtonNames[
            `${entityType.dtype}_${entityType.id}`
          ] = `(${entityType.dtype}) ${entityType.name}`;
        }
      }
    } else if (this._queryType == "localizations") {
      var selectedTypeIDs = this.getSelectedLocalizationTypes();

      for (const entityType of this._utils._localizationTypes) {
        if (selectedTypeIDs.includes(entityType.id)) {
          this._entityTypeMap[`${entityType.dtype}_${entityType.id}`] =
            entityType;
          this._typePageButtonNames[
            `${entityType.dtype}_${entityType.id}`
          ] = `(${entityType.dtype}) ${entityType.name}`;
        }
      }

      for (const entityType of this._utils._mediaTypes) {
        this._relatedEntityTypeMap[`${entityType.dtype}_${entityType.id}`] =
          entityType;
        this._relatedTypePageButtonNames[
          `${entityType.dtype}_${entityType.id}`
        ] = `(Related ${entityType.dtype}) ${entityType.name}`;
      }
    } else if (this._queryType == "states") {
      var selectedTypeIDs = this.getSelectedStateTypes();

      for (const entityType of this._utils._stateTypes) {
        if (selectedTypeIDs.includes(entityType.id)) {
          this._entityTypeMap[`${entityType.dtype}_${entityType.id}`] =
            entityType;
          this._typePageButtonNames[
            `${entityType.dtype}_${entityType.id}`
          ] = `(${entityType.association.toLowerCase()}) ${entityType.name}`;
        }
      }

      for (const entityType of this._utils._mediaTypes) {
        this._relatedEntityTypeMap[`${entityType.dtype}_${entityType.id}`] =
          entityType;
        this._relatedTypePageButtonNames[
          `${entityType.dtype}_${entityType.id}`
        ] = `(Related ${entityType.dtype}) ${entityType.name}`;
      }
    }

    for (const id in this._typePageButtonNames) {
      this._sortedTypePageButtonNames.push(this._typePageButtonNames[id]);
    }
    this._sortedTypePageButtonNames.sort();

    for (const id in this._relatedTypePageButtonNames) {
      this._relatedSortedTypePageButtonNames.push(
        this._relatedTypePageButtonNames[id]
      );
    }
    this._relatedSortedTypePageButtonNames.sort();

    this.updateMainTypePage();
    this.updateRelatedTypePage();

    var parentDiv = this._shadow.getElementById("selectedColumns");
    while (parentDiv.firstChild) {
      parentDiv.removeChild(parentDiv.firstChild);
    }

    this._relatedSortedUserAttributeNames = Object.keys(
      this._relatedUserAttributeCheckboxes
    );
    this._relatedSortedUserAttributeNames.sort();
    this._relatedSortedBuiltInAttributeNames = Object.keys(
      this._relatedBuiltInAttributeCheckboxes
    );

    for (const attrName of this._relatedSortedBuiltInAttributeNames) {
      var label = document.createElement("div");
      label.setAttribute("class", "py-1");
      label.setAttribute("id", `_selected_${attrName}`);
      label.textContent = attrName;
      label.style.display = "none";
      parentDiv.appendChild(label);
      this.selectBuiltInAttribute(attrName, true, "relatedMedia");
    }
    for (const attrName of this._relatedSortedUserAttributeNames) {
      var label = document.createElement("div");
      label.setAttribute("class", "py-1");
      label.setAttribute("id", `_selected_${attrName}`);
      label.textContent = attrName;
      label.style.display = "none";
      parentDiv.appendChild(label);
      this.selectUserAttribute(attrName, true, "relatedMedia");
    }

    this._sortedUserAttributeNames = Object.keys(this._userAttributeCheckboxes);
    this._sortedUserAttributeNames.sort();
    this._sortedBuiltInAttributeNames = Object.keys(
      this._builtInAttributeCheckboxes
    );

    for (const attrName of this._sortedBuiltInAttributeNames) {
      var label = document.createElement("div");
      label.setAttribute("class", "py-1");
      label.setAttribute("id", `_selected_${attrName}`);
      label.textContent = attrName;
      label.style.display = "none";
      parentDiv.appendChild(label);
      this.selectBuiltInAttribute(attrName, true, "main");
    }
    for (const attrName of this._sortedUserAttributeNames) {
      var label = document.createElement("div");
      label.setAttribute("class", "py-1");
      label.setAttribute("id", `_selected_${attrName}`);
      label.textContent = attrName;
      label.style.display = "none";
      parentDiv.appendChild(label);
      this.selectUserAttribute(attrName, true, "main");
    }

    // Click the first set of types on each page
    this._typePageButtons[this._firstPageId].click();
    if (this._queryType != "media") {
      this._relatedTypePageButtons[this._relatedFirstPageId].click();
    }
  }

  /**
   * Create chevron SVG seen elsewhere in Tator
   * @return <svg>
   */
  makeChevron() {
    const chevron = document.createElementNS(svgNamespace, "svg");
    chevron.setAttribute("class", "chevron px-1 chevron-trigger-90");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("height", "1em");
    chevron.setAttribute("width", "1em");

    const chevronPath = document.createElementNS(svgNamespace, "path");
    chevronPath.setAttribute(
      "d",
      "M9.707 18.707l6-6c0.391-0.391 0.391-1.024 0-1.414l-6-6c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0z"
    );

    chevron.appendChild(chevronPath);
    return chevron;
  }

  /**
   * Create attribute name checkbox element
   * @return <checkbox-input>
   */
  makeCheckbox(name) {
    let checkbox = document.createElement("checkbox-input");
    checkbox.setAttribute("name", name);
    checkbox.setAttribute("class", "f2");
    checkbox._input.style.marginLeft = "20px";
    checkbox.styleSpan.setAttribute("class", "px-2");
    checkbox._checked = false;
    checkbox._input.style.cursor = "pointer";
    checkbox.styleSpan.style.cursor = "pointer";
    return checkbox;
  }

  /**
   * Used in conjunction with makeAttributeSections()
   * @param pageParentDiv {<div>}
   * @param entityType {Tator Entity Type}
   * @param pageType {string} "main" or "relatedMedia"
   * @postcondition this._attributeSelectMap updated
   */
  makeAttributePage(pageParentDiv, entityType, pageType) {
    var parentDiv = document.createElement("div");
    parentDiv.setAttribute("class", "d-flex flex-grow col-12 flex-column");
    pageParentDiv.appendChild(parentDiv);

    const entityTypeKey = `${entityType.dtype}_${entityType.id}`;

    if (pageType == "main") {
      this._attributesByType[entityTypeKey] = [];
    } else if (pageType == "relatedMedia") {
      this._relatedAttributesByType[entityTypeKey] = [];
    }
    var ungroupedUserAttributes = [];
    var hiddenAttributes = [];

    //
    // Set the built in attributes by queryType
    //
    // queryType == "media"
    //
    // $id
    // $elemental_id
    // $name
    // $section_id
    // $section_name
    // $created_by_id
    // $created_by_username
    // $created_by_name
    // $created_datetime
    // $modified_by_id
    // $modified_by_username
    // $modified_by_name
    // $modified_datetime
    // $type_name
    // $type_id
    // $width
    // $height
    // $fps
    // $num_frames
    // $duration_minutes
    // $streaming_resolutions
    // $archive_state
    // $url
    //
    // queryType == "localization"
    //
    // $id
    // $elemental_id
    // $parent
    // $section_id
    // $section_name
    // $version_id
    // $version_name
    // $media_name
    // $media_id
    // $frame
    // $created_by_id
    // $created_by_username
    // $created_by_name
    // $created_datetime
    // $modified_by_id
    // $modified_by_username
    // $modified_by_name
    // $modified_datetime
    // $type_name
    // $type_id
    // $x
    // $x_pixels
    // $y
    // $y_pixels
    // $u
    // $u_pixels
    // $v
    // $v_pixels
    // $width
    // $width_pixels
    // $height
    // $height_pixels
    // $points
    // $points_pixels
    // $url
    //
    // queryType == "state"
    //
    // $id
    // $elemental_id
    // $parent
    // $section_ids
    // $section_names
    // $version_id
    // $version_name
    // $media_ids
    // $media_names
    // $frame
    // $created_by_id
    // $created_by_username
    // $created_by_name
    // $created_datetime
    // $modified_by_id
    // $modified_by_username
    // $modified_by_name
    // $modified_datetime
    // $type_name
    // $type_id
    // $localization_ids
    // $url
    //
    var builtInAttributes = [];
    if (this._queryType == "media" && pageType == "main") {
      var builtInAttributes = [
        "$id",
        "$name",
        "$section_id",
        "$section_name",
        "$created_by_id",
        "$created_by_username",
        "$created_by_name",
        "$created_datetime",
        "$modified_by_id",
        "$modified_by_username",
        "$modified_by_name",
        "$modified_datetime",
        "$type_name",
        "$type_id",
        "$width",
        "$height",
        "$fps",
        "$num_frames",
        "$duration_minutes",
        "$streaming_resolutions",
        "$archive_state",
        "$url",
      ];
      if (entityType.dtype == "image") {
        var attrsToRemove = [
          "$fps",
          "$num_frames",
          "$duration_minutes",
          "streaming_resolutions",
        ];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      }
      this._attributesByType[entityTypeKey] = [...builtInAttributes];
    } else if (this._queryType == "localizations" && pageType == "main") {
      var builtInAttributes = [
        "$id",
        "$elemental_id",
        "$parent",
        "$section_id",
        "$section_name",
        "$version_id",
        "$version_name",
        "$media_name",
        "$media_id",
        "$frame",
        "$created_by_id",
        "$created_by_username",
        "$created_by_name",
        "$created_datetime",
        "$modified_by_id",
        "$modified_by_username",
        "$modified_by_name",
        "$modified_datetime",
        "$type_name",
        "$type_id",
        "$x",
        "$x_pixels",
        "$y",
        "$y_pixels",
        "$u",
        "$u_pixels",
        "$v",
        "$v_pixels",
        "$width",
        "$width_pixels",
        "$height",
        "$height_pixels",
        "$points",
        "$points_pixels",
        "$url",
      ];
      if (entityType.dtype == "box") {
        var attrsToRemove = [
          "$u",
          "$v",
          "$points",
          "$u_pixels",
          "$v_pixels",
          "$points_pixels",
        ];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      } else if (entityType.dtype == "line") {
        var attrsToRemove = [
          "$width",
          "$height",
          "$points",
          "$width_pixels",
          "$height_pixels",
          "$points_pixels",
        ];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      } else if (entityType.dtype == "dot") {
        var attrsToRemove = [
          "$u",
          "$v",
          "$width",
          "$height",
          "$points",
          "$u_pixels",
          "$v_pixels",
          "$width_pixels",
          "$height_pixels",
          "$points_pixels",
        ];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      } else if (entityType.dtype == "poly") {
        var attrsToRemove = [
          "$x",
          "$y",
          "$u",
          "$v",
          "$width",
          "$height",
          "$x_pixels",
          "$y_pixels",
          "$u_pixels",
          "$v_pixels",
          "$width_pixels",
          "$height_pixels",
        ];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      }
      this._attributesByType[entityTypeKey] = [...builtInAttributes];
    } else if (this._queryType == "states" && pageType == "main") {
      var builtInAttributes = [
        "$id",
        "$elemental_id",
        "$parent",
        "$section_ids",
        "$section_names",
        "$version_id",
        "$version_name",
        "$media_ids",
        "$media_names",
        "$frame",
        "$created_by_id",
        "$created_by_username",
        "$created_by_name",
        "$created_datetime",
        "$modified_by_id",
        "$modified_by_username",
        "$modified_by_name",
        "$modified_datetime",
        "$type_name",
        "$type_id",
        "$localization_ids",
        "$url",
      ];
      if (entityType.association.toLowerCase() == "frame") {
        var attrsToRemove = ["$localization_ids"];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      } else if (entityType.association.toLowerCase() == "media") {
        var attrsToRemove = ["$localization_ids", "$frame"];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      } else if (entityType.association.toLowerCase() == "localizations") {
        var attrsToRemove = ["$frame"];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      }
      this._attributesByType[entityTypeKey] = [...builtInAttributes];
    } else if (pageType == "relatedMedia") {
      var builtInAttributes = [
        "$id",
        "$name",
        "$section_id",
        "$section_name",
        "$created_by_id",
        "$created_by_username",
        "$created_by_name",
        "$created_datetime",
        "$modified_by_id",
        "$modified_by_username",
        "$modified_by_name",
        "$modified_datetime",
        "$type_name",
        "$type_id",
        "$width",
        "$height",
        "$fps",
        "$num_frames",
        "$duration_minutes",
        "$streaming_resolutions",
        "$archive_state",
      ];
      if (entityType.dtype == "image") {
        var attrsToRemove = [
          "$fps",
          "$num_frames",
          "$duration_minutes",
          "streaming_resolutions",
        ];
        builtInAttributes = builtInAttributes.filter(
          (attr) => !attrsToRemove.includes(attr)
        );
      }
      var newBuiltInAttributes = [];
      for (const val of builtInAttributes) {
        newBuiltInAttributes.push(`(media) ${val}`);
      }
      builtInAttributes = newBuiltInAttributes;
      this._relatedAttributesByType[entityTypeKey] = [...builtInAttributes];
    }

    //
    // Organize the user attributes by order and visibility
    //
    const allSortedAttrTypes = entityType.attribute_types.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    for (const attrType of allSortedAttrTypes) {
      var attrName = attrType.name;
      if (pageType == "main") {
        attrName = attrType.name;
        this._attributesByType[entityTypeKey].push(attrName);
      } else if (pageType == "relatedMedia") {
        attrName = `(media) ${attrType.name}`;
        this._relatedAttributesByType[entityTypeKey].push(attrName);
      }

      if (attrType.order < 0) {
        hiddenAttributes.push(attrName);
      } else if (attrType.visible == false) {
        hiddenAttributes.push(attrName);
      } else {
        ungroupedUserAttributes.push(attrName);
      }
    }

    //
    // Create a section for the built-in attributes
    //
    var wrapperDiv = document.createElement("div");
    wrapperDiv.setAttribute("class", "d-flex flex-column mx-3");
    parentDiv.appendChild(wrapperDiv);

    var headerDiv = document.createElement("div");
    headerDiv.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center"
    );
    wrapperDiv.appendChild(headerDiv);

    var labelDiv = document.createElement("div");
    labelDiv.setAttribute(
      "class",
      "f2 text-gray text-semibold clickable py-2 chevron-trigger-90"
    );
    labelDiv.textContent = "Built-in Attributes";
    headerDiv.appendChild(labelDiv);
    var chevron = this.makeChevron();
    labelDiv.appendChild(chevron);

    var builtInButton = document.createElement("button");
    builtInButton.setAttribute(
      "class",
      "btn-clear d-flex flex-justify-center flex-items-center rounded-1 f2 text-gray entity__button box-border my-1 px-2"
    );
    builtInButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All</span>
    `;
    headerDiv.appendChild(builtInButton);

    var builtinInfoDiv = document.createElement("div");
    builtinInfoDiv.setAttribute(
      "class",
      "py-3 px-2 text-gray f2 mb-2 box-border"
    );
    builtinInfoDiv.style.backgroundColor = "#00070D";
    wrapperDiv.appendChild(builtinInfoDiv);

    labelDiv.addEventListener("click", (evt) => {
      builtinInfoDiv.hidden = !builtinInfoDiv.hidden;
      evt.target.classList.toggle("chevron-trigger-90");
    });

    for (const attrName of builtInAttributes) {
      let checkbox = this.makeCheckbox(attrName);
      builtinInfoDiv.appendChild(checkbox);
      this.addToBuiltinCheckboxes(attrName, checkbox, entityType, pageType);
    }

    builtInButton.addEventListener("click", () => {
      builtInButton.blur();
      this._pageStatus[entityTypeKey].builtInAttributesToggle =
        !this._pageStatus[entityTypeKey].builtInAttributesToggle;
      for (const attrName of this._pageStatus[entityTypeKey]
        .builtInAttributes) {
        this.selectBuiltInAttribute(
          attrName,
          this._pageStatus[entityTypeKey].builtInAttributesToggle,
          pageType
        );
      }
    });

    //
    // Create a section for the visible user attributes
    //
    var wrapperDiv = document.createElement("div");
    wrapperDiv.setAttribute("class", "d-flex flex-column mx-3");
    parentDiv.appendChild(wrapperDiv);

    var headerDiv = document.createElement("div");
    headerDiv.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center"
    );
    wrapperDiv.appendChild(headerDiv);

    var labelDiv = document.createElement("div");
    labelDiv.setAttribute(
      "class",
      "f2 text-gray text-semibold clickable py-2 chevron-trigger-90"
    );
    labelDiv.textContent = "Custom Attributes";
    headerDiv.appendChild(labelDiv);
    var chevron = this.makeChevron();
    labelDiv.appendChild(chevron);

    var visibleButton = document.createElement("button");
    visibleButton.setAttribute(
      "class",
      "btn-clear d-flex flex-justify-center flex-items-center rounded-1 f2 text-gray entity__button box-border my-1 px-2"
    );
    visibleButton.innerHTML += `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
    </svg>
    <span class="ml-3">Toggle All</span>
    `;
    headerDiv.appendChild(visibleButton);

    var visibleInfoDiv = document.createElement("div");
    visibleInfoDiv.setAttribute(
      "class",
      "py-3 px-2 text-gray f2 mb-2 box-border"
    );
    visibleInfoDiv.style.backgroundColor = "#00070D";
    wrapperDiv.appendChild(visibleInfoDiv);

    for (const attrName of ungroupedUserAttributes) {
      let checkbox = this.makeCheckbox(attrName);
      visibleInfoDiv.appendChild(checkbox);
      this.addToUserCheckboxes(attrName, checkbox, entityType, pageType);
    }

    labelDiv.addEventListener("click", (evt) => {
      visibleInfoDiv.hidden = !visibleInfoDiv.hidden;
      evt.target.classList.toggle("chevron-trigger-90");
    });

    visibleButton.addEventListener("click", () => {
      visibleButton.blur();
      this._pageStatus[entityTypeKey].visibleAttributesToggle =
        !this._pageStatus[entityTypeKey].visibleAttributesToggle;
      for (const attrName of this._pageStatus[entityTypeKey]
        .visibleAttributes) {
        this.selectUserAttribute(
          attrName,
          this._pageStatus[entityTypeKey].visibleAttributesToggle,
          pageType
        );
      }
    });

    //
    // Create a section for the hidden attributes
    //
    if (hiddenAttributes.length > 0) {
      var wrapperDiv = document.createElement("div");
      wrapperDiv.setAttribute("class", "d-flex flex-column mx-3");
      parentDiv.appendChild(wrapperDiv);

      var headerDiv = document.createElement("div");
      headerDiv.setAttribute(
        "class",
        "d-flex flex-justify-between flex-items-center"
      );
      wrapperDiv.appendChild(headerDiv);

      var labelDiv = document.createElement("div");
      labelDiv.setAttribute(
        "class",
        "f2 text-gray text-semibold clickable py-2 chevron-trigger-90"
      );
      labelDiv.textContent = "Hidden Custom Attributes";
      headerDiv.appendChild(labelDiv);
      var chevron = this.makeChevron();
      labelDiv.appendChild(chevron);

      var hiddenButton = document.createElement("button");
      hiddenButton.setAttribute(
        "class",
        "btn-clear d-flex flex-justify-center flex-items-center rounded-1 f2 text-gray entity__button box-border my-1 px-2"
      );
      hiddenButton.innerHTML += `
      <svg xmlns="http://www.w3.org/2000/svg" class="no-fill" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" /><path d="M11 14l2 2l4 -4" />
      </svg>
      <span class="ml-3">Toggle All</span>
      `;
      headerDiv.appendChild(hiddenButton);

      var hiddenInfoDiv = document.createElement("div");
      hiddenInfoDiv.setAttribute(
        "class",
        "py-3 px-2 text-gray f2 mb-2 box-border"
      );
      hiddenInfoDiv.style.backgroundColor = "#00070D";
      wrapperDiv.appendChild(hiddenInfoDiv);

      for (const attrName of hiddenAttributes) {
        let checkbox = this.makeCheckbox(attrName);
        hiddenInfoDiv.appendChild(checkbox);
        this.addToUserCheckboxes(attrName, checkbox, entityType, pageType);
      }

      labelDiv.addEventListener("click", (evt) => {
        hiddenInfoDiv.hidden = !hiddenInfoDiv.hidden;
        evt.target.classList.toggle("chevron-trigger-90");
      });

      hiddenButton.addEventListener("click", () => {
        hiddenButton.blur();
        this._pageStatus[entityTypeKey].hiddenAttributesToggle =
          !this._pageStatus[entityTypeKey].hiddenAttributesToggle;
        for (const attrName of this._pageStatus[entityTypeKey]
          .hiddenAttributes) {
          this.selectUserAttribute(
            attrName,
            this._pageStatus[entityTypeKey].hiddenAttributesToggle,
            pageType
          );
        }
      });
    }

    this._pageStatus[entityTypeKey] = {
      hiddenAttributesToggle: false,
      visibleAttributesToggle: true,
      builtInAttributesToggle: true,
      hiddenAttributes: hiddenAttributes,
      visibleAttributes: ungroupedUserAttributes,
      builtInAttributes: builtInAttributes,
    };

    return parentDiv;
  }

  /**
   * @param {string} page - Page to switch to in the query UI
   */
  switchQueryPage(page) {
    this._shadow.getElementById("pageQueryType_edit").style.display = "flex";
    this._shadow.getElementById("pageQueryType_main").style.display = "none";
    this._shadow.getElementById("pageMediaFilters").style.display = "flex";
    this._shadow.getElementById("pageMediaFilters_edit").style.display = "flex";
    this._shadow.getElementById("pageMediaFilters_main").style.display = "none";
    this._shadow.getElementById("pageMetadataFilters").style.display = "flex";
    this._shadow.getElementById("pageMetadataFilters_edit").style.display =
      "flex";
    this._shadow.getElementById("pageMetadataFilters_main").style.display =
      "none";
    this._shadow.getElementById("pageQueryData_main").style.display = "none";

    if (page == "queryType") {
      this._shadow.getElementById("pageQueryType_edit").style.display = "none";
      this._shadow.getElementById("pageMediaFilters_edit").style.display =
        "none";
      this._shadow.getElementById("pageMetadataFilters_edit").style.display =
        "none";
      this._shadow.getElementById("pageQueryType_main").style.display = "flex";
      this._shadow.getElementById("pageMediaFilters").style.display = "none";
      this._shadow.getElementById("pageMetadataFilters").style.display = "none";
    } else if (page == "mediaFilters") {
      this._shadow.getElementById("pageMetadataFilters").style.display = "none";
      this._shadow.getElementById("pageMetadataFilters_edit").style.display =
        "none";
      this._shadow.getElementById("pageMediaFilters_edit").style.display =
        "none";
      this._shadow.getElementById("pageMediaFilters_main").style.display =
        "flex";
    } else if (page == "metadataFilters") {
      this._shadow.getElementById("pageMetadataFilters_edit").style.display =
        "none";
      this._shadow.getElementById("pageMetadataFilters_main").style.display =
        "flex";
    } else if (page == "queryData") {
      if (this._queryType == "media") {
        this._exportPageMainTab.style.display = "flex";
        this._exportPageRelatedTab.style.display = "none";
      } else {
        this._exportPageMainTab.style.display = "flex";
        this._exportPageRelatedTab.style.display = "flex";
      }
      this.switchExportPage("report");
      this._shadow.getElementById("pageQueryData_main").style.display = "flex";
    }
  }
}

customElements.define("export-page", MainPage);
