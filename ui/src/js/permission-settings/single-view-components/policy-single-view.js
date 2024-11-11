import { TatorElement } from "../../components/tator-element.js";
import {
  POLICY_ENTITY_NAME,
  POLICY_TARGET_NAME,
  store,
  fetchWithHttpInfo,
} from "../store.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";

const EDIT_COLUMN = [
  "Level\n(Self-level to Descendant-level)",
  "Exist",
  "Read",
  "Create",
  "Modify",
  "Delete",
  "Execute",
  "Upload",
  "ACL",
  "Shortcuts",
];
const EDIT_COLGROUP = `
<col style="width: 14%" />
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 14%" />
`;

const BYTE_COUNT = {
  project: 5,
  media: null,
  localization: null,
  state: null,
  file: null,
  section: 3,
  algorithm: 1,
  version: 2,
  target_organization: 5,
  target_group: 1,
  job_cluster: null,
  bucket: null,
  hosted_template: 1,
};

const ENTITY_TYPE_CHOICES = [
  { label: "User", value: "user" },
  { label: "Group", value: "group" },
  { label: "Organization", value: "organization" },
];
const TARGET_TYPE_CHOICES = [
  { label: "Project", value: "project" },
  { label: "Media", value: "media" },
  { label: "Localization", value: "localization" },
  { label: "State", value: "state" },
  { label: "File", value: "file" },
  { label: "Section", value: "section" },
  { label: "Algorithm", value: "algorithm" },
  { label: "Version", value: "version" },
  { label: "Organization", value: "target_organization" },
  { label: "Group", value: "target_group" },
  { label: "Job Cluster", value: "job_cluster" },
  { label: "Bucket", value: "bucket" },
  { label: "Hosted Template", value: "hosted_template" },
];
const QUICK_FILL_CHOICES = [
  { label: "Not Selected", value: "" },
  { label: "Full Control", value: "Full Control" },
  { label: "Admin", value: "Admin" },
  { label: "Editor", value: "Editor" },
  { label: "Annotator", value: "Annotator" },
  { label: "Verifier", value: "Verifier" },
  { label: "Viewer", value: "Viewer" },
  { label: "No Access", value: "No Access" },
];
const PARENT_TARGET = {
  section: ["section", "project"],
  project: ["project"],
  version: ["version", "project"],
};

export class PolicySingleView extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("policy-single-view").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._title = this._shadow.getElementById("title");

    this._noData = this._shadow.getElementById("no-data");
    this._noPermission = this._shadow.getElementById("no-permission");

    this._permissionInputDiv = this._shadow.getElementById(
      "permission-input-div"
    );
    this._quickFillInput = this._shadow.getElementById("quick-fill-input");
    this._permissionInput = this._shadow.getElementById("permission-input");

    this._entityTypeInput = this._shadow.getElementById("entity-type-input");
    this._entityIdInput = this._shadow.getElementById("entity-id-input");
    this._targetTypeInput = this._shadow.getElementById("target-type-input");
    this._targetIdInput = this._shadow.getElementById("target-id-input");
    this._inputs = [
      this._entityTypeInput,
      this._entityIdInput,
      this._targetTypeInput,
      this._targetIdInput,
    ];
    this._inputsDiv = this._shadow.getElementById("inputs-div");

    this._tableDiv = this._shadow.getElementById("edit-table-div");
    this._table = this._shadow.getElementById("edit-table");
    this._colgroup = this._shadow.getElementById("edit-table--colgroup");
    this._tableHead = this._shadow.getElementById("edit-table--head");
    this._tableBody = this._shadow.getElementById("edit-table--body");

    this._form = this._shadow.getElementById("edit-table-form");
    this._saveReset = this._shadow.getElementById(
      "edit-table--save-reset-section"
    );
    this._saveButton = this._shadow.getElementById("edit-table-save");
    this._resetButton = this._shadow.getElementById("edit-table-reset");
    this._deleteButton = this._shadow.getElementById("edit-table-delete");

    // // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
    this._permissionMask = new PermissionMask();

    this._initInputs();

    this._inputs.forEach((input) => {
      input.addEventListener("change", this._inputChange.bind(this));
    });

    store.subscribe(
      (state) => state.selectedType,
      this._updateSelectedType.bind(this)
    );

    store.subscribe((state) => state.Policy, this._setData.bind(this));

    this._saveButton.addEventListener("click", this._saveForm.bind(this));
    this._resetButton.addEventListener("click", this._resetTable.bind(this));
    this._deleteButton.addEventListener(
      "click",
      this._openDeletePolicyModal.bind(this)
    );

    this._permissionInput.addEventListener(
      "change",
      this._changePermissionInput.bind(this)
    );

    this._quickFillInput.addEventListener(
      "change",
      this._changeQuickFillInput.bind(this)
    );
  }

  _updateSelectedType(newSelectedType, oldSelectedType) {
    if (
      newSelectedType.typeName !== "Policy" ||
      newSelectedType.typeId === "All" ||
      newSelectedType.typeId.startsWith("Cal")
    ) {
      this._show = false;
      return;
    }

    // state.Policy may not be initialized, so show the spinner at first
    this.showDimmer();
    this.loading.showSpinner();

    this._show = true;
    this.id = newSelectedType.typeId;
  }

  /**
   * @param {string} val
   */
  set id(val) {
    this._id = val;

    // Styles reset at the very beginning
    this._noData.setAttribute("hidden", "");
    this._noPermission.setAttribute("hidden", "");
    this._inputsDiv.style.display = "";
    this._permissionInputDiv.style.display = "";
    this._permissionInput.permission = "Can Edit";
    this._permissionInput.setValue(null);
    this._quickFillInput.permission = "Can Edit";
    this._quickFillInput.setValue("");
    this._saveReset.style.display = "";
    this._tableDiv.setAttribute("hidden", "");

    // New policy
    if (this._id === "New") {
      this._resetButton.style.display = "";
      this._deleteButton.style.display = "none";
      this._title.innerText = "New Policy";

      this._inputs.forEach((input) => (input.permission = "Can Edit"));
    }
    // Edit policy
    else {
      this._resetButton.style.display = "";
      this._deleteButton.style.display = "";
      this._title.innerText = "Edit Policy";

      this._inputs.forEach((input) => (input.permission = "View Only"));
    }

    this._setData();
  }

  _setData() {
    if (!this._show) return;
    const { Policy } = store.getState();
    if (!Policy.init) return;

    // state.Policy initialized, remove the spinner
    if (this.hasAttribute("has-open-modal")) {
      this.hideDimmer();
      this.loading.hideSpinner();
    }

    // New policy
    if (this._id === "New") {
      this._initByInputs();
    }
    // Edit policy
    else {
      this._initByInputs(Policy.processedMap.get(+this._id));
    }
  }

  /**
   * @param {object} val
   */
  // val is undefined, or an object that has entityType, entityId, targetType, targetId to fetch data
  async _initByInputs(val) {
    console.log("😇 ~ _initByInputs ~ val:", val, this._id);

    if (val) {
      this.showDimmer();
      this.loading.showSpinner();

      this._setInputValues(val);
      this._storeInputValues();
      this._data = await this._getDataByInputs();
      this._processPermission();
    } else {
      // New policy
      if (this._id === "New") {
        this._entityIdInput.setValue(null);
        this._targetIdInput.setValue(null);
      }
      // Edit policy
      else {
        // didn't find in states, then manually fetch
        this._data = await this._getDataById();
        this._setInputValues(this._data);
        this._storeInputValues();
        this._processPermission();
      }
    }
  }

  _storeInputValues() {
    console.log("_storeInputValues");
    this._entityType = this._entityTypeInput.getValue();
    this._entityId = this._entityIdInput.getValue();
    this._targetType = this._targetTypeInput.getValue();
    this._targetId = this._targetIdInput.getValue();

    this._requestedEntityName = `${POLICY_ENTITY_NAME[this._entityType]} ${
      this._entityId
    }`;
    this._requestedTargetName = `${POLICY_TARGET_NAME[this._targetType]} ${
      this._targetId
    }`;
    console.log(this._entityType);
  }
  _setInputValues(val) {
    console.log("_setInputValues", val);
    this._entityTypeInput.setValue(val.entityType);
    this._entityIdInput.setValue(val.entityId);
    this._targetTypeInput.setValue(val.targetType);
    this._targetIdInput.setValue(val.targetId);
  }

  // when state.Policy has this._id
  // Or when user wants to create a new policy and have filled in all the inputs
  async _getDataByInputs() {
    const {
      Policy: { processedData },
    } = store.getState();
    console.log(this._entityType, processedData, this._targetType);
    const data = processedData.find((policy) => {
      return (
        policy.entityType === this._entityType &&
        policy.entityId === this._entityId &&
        policy.targetType === this._targetType &&
        policy.targetId === this._targetId
      );
    });

    if (data) {
      return data;
    } else {
      const policies = await store
        .getState()
        .getPoliciesByTargets([[this._targetType, this._targetId]]);

      // No policy exists
      if (!policies.length) {
        return {
          id: null,
          permission: null,
          entityType: this._entityType,
          entityId: this._entityId,
          entityName: this._requestedEntityName,
          targetType: this._targetType,
          targetId: this._targetId,
          targetName: this._requestedTargetName,
        };
      }
      // User has no permission on the target
      if (policies[0].permission === -1) {
        return { id: null, permission: -1 };
      }

      const policy = policies.find(
        (policy) => policy.entityName === this._requestedEntityName
      );
      // already has this policy
      if (policy) {
        return policy;
      }
      // No policy exists
      else {
        return {
          id: null,
          permission: null,
          entityType: this._entityType,
          entityId: this._entityId,
          entityName: this._requestedEntityName,
          targetType: this._targetType,
          targetId: this._targetId,
          targetName: this._requestedTargetName,
        };
      }
    }
  }

  // When state.Policy has NO this._id
  async _getDataById() {
    // Fetch Policy
    try {
      const data = await store.getState().getPolicyById(+this._id);
      return data;
    } catch (error) {
      console.error(error);

      if (this.hasAttribute("has-open-modal")) {
        this.hideDimmer();
        this.loading.hideSpinner();
      }
      this._noData.removeAttribute("hidden");
      this._noData.innerText = error;
      return;
    }
  }

  _processPermission() {
    console.log(this._data);

    // When user wants to create a new policy
    if (this._id === "New") {
      // policy not exists
      if (!this._data.permission) {
        this._quickFillInput.permission = "Can Edit";
        this._permissionInput.permission = "Can Edit";
        this._quickFillInput.resetChoices();
        this._quickFillInput.choices = this._getQuickFillChoices();

        this._permissionInputValue = {};

        // clear table
        this._tableDiv.removeAttribute("hidden");
        this._tableHead.innerHTML = "";
        this._tableBody.innerHTML = "";
        // Head
        this._renderEditTableHead();
        // Body
        this._resetTable();

        this._saveReset.style.display = "";
        if (this.hasAttribute("has-open-modal")) {
          this.hideDimmer();
          this.loading.hideSpinner();
        }
      }
      // policy not permitted to fetch
      else if (this._data.permission === -1) {
        this._quickFillInput.permission = "View Only";
        this._permissionInput.permission = "View Only";
        this._noPermission.removeAttribute("hidden");
        this._noPermission.innerText = `You don't have permission to create new policy towards ${this._requestedTargetName}.`;
        this._tableDiv.setAttribute("hidden", "");
        this._saveReset.style.display = "none";

        if (this.hasAttribute("has-open-modal")) {
          this.hideDimmer();
          this.loading.hideSpinner();
        }
      }
      // policy data fetched, should redirect to the edit policy view
      else {
        window.location.hash = `#Policy-${this._data.id}`;
      }
    }
    // When user wants to edit the policy
    else {
      // policy not exists
      if (!this._data.permission) {
        this._inputsDiv.style.display = "none";
        this._permissionInputDiv.style.display = "none";
        this._noData.removeAttribute("hidden");
        this._noData.innerText = `There is no data for Policy ${this._id}.`;
        this._tableDiv.setAttribute("hidden", "");
        this._saveReset.style.display = "none";
      }
      // policy not permitted to fetch
      else if (this._data.permission === -1) {
        this._quickFillInput.permission = "View Only";
        this._permissionInput.permission = "View Only";
        this._noPermission.removeAttribute("hidden");
        this._noPermission.innerText = `You don't have permission to edit Policy ${this._id}.`;
        this._tableDiv.setAttribute("hidden", "");
        this._saveReset.style.display = "none";
      }
      // policy data fetched
      else {
        this._quickFillInput.resetChoices();
        this._quickFillInput.choices = this._getQuickFillChoices();
        this._inputsDiv.style.display = "";

        this._permissionInputValue = {};

        // clear table
        this._tableDiv.removeAttribute("hidden");
        this._tableHead.innerHTML = "";
        this._tableBody.innerHTML = "";
        // Head
        this._renderEditTableHead();
        // Body
        this._resetTable();

        this._saveReset.style.display = "";
        if (this.hasAttribute("has-open-modal")) {
          this.hideDimmer();
          this.loading.hideSpinner();
        }
      }
    }
  }

  _renderEditTableBody() {
    this._tableBody.innerHTML = "";

    this._permissionInput.setValue(this._permissionInputValue.decimal);
    const chunks = this._splitIntoChunksOf8Chars(
      this._permissionInputValue.binary
    );
    const levelCount = chunks.length;

    // Note: reverse() modify the original array
    chunks.reverse().forEach((byte, level) => {
      const tr = document.createElement("tr");

      // Level Column
      const tdLevel = document.createElement("td");
      tdLevel.innerText = `Level ${level + 1}`;
      tr.appendChild(tdLevel);

      if (level === 0) {
        tdLevel.innerText += `\n(Self-level)`;
      }
      if (level === chunks.length - 1) {
        tdLevel.innerText += `\n(Youngest Descendant-level)`;
      }

      // Permission Columns
      byte
        .split("")
        .reverse()
        .forEach((char, index) => {
          // id is the index of this char in binaryPermission
          const id = (levelCount - level) * 8 - (index + 1);
          const td = document.createElement("td");
          if (char === "0") {
            const xmark = document.createElement("no-permission-button");
            xmark.setAttribute("data-id", id);
            xmark.addEventListener(
              "click",
              this._changeEditTableCell.bind(this)
            );
            td.appendChild(xmark);
          } else if (char === "1") {
            const check = document.createElement("has-permission-button");
            check.setAttribute("data-id", id);
            check.addEventListener(
              "click",
              this._changeEditTableCell.bind(this)
            );
            td.appendChild(check);
          }
          tr.appendChild(td);
        });

      // Shortcuts Column
      const tdSc = document.createElement("td");
      const div = document.createElement("div");
      div.classList.add("d-flex", "flex-row", "flex-justify-center");
      div.style.gap = "5px";
      tdSc.appendChild(div);

      const grant = document.createElement("grant-all-button");
      grant.setAttribute("data-level", level);
      grant.addEventListener("click", this._grantRow.bind(this));
      div.appendChild(grant);
      const disallow = document.createElement("disallow-permission-button");
      disallow.setAttribute("title", "Disallow All Permission");
      disallow.setAttribute("data-level", level);
      disallow.addEventListener("click", this._disallowRow.bind(this));
      div.appendChild(disallow);

      tr.appendChild(tdSc);

      this._tableBody.appendChild(tr);
    });
  }

  _renderEditTableHead() {
    this._colgroup.innerHTML = EDIT_COLGROUP;

    const tr = document.createElement("tr");
    EDIT_COLUMN.map((val) => {
      const th = document.createElement("th");
      th.innerText = val;
      return th;
    }).forEach((th) => {
      tr.appendChild(th);
    });
    this._tableHead.appendChild(tr);
  }

  _changeEditTableCell(evt) {
    this._quickFillInput.setValue("");

    const index = +evt.target.dataset.id;
    if (isNaN(index)) return;

    const oldBinary = this._permissionInputValue.binary;
    const oldChar = oldBinary.at(index);
    const newChar = oldChar === "0" ? "1" : "0";
    let newBinary =
      oldBinary.slice(0, index) + newChar + oldBinary.slice(index + 1);
    const newDecimal = parseInt(newBinary, 2);
    this._permissionInputValue.binary = newBinary;
    this._permissionInputValue.decimal = newDecimal;
    this._renderEditTableBody();
  }

  _grantRow(evt) {
    const level = +evt.target.dataset.level;
    if (isNaN(level)) return;

    this._quickFillInput.setValue("");
    const levelCount = this._permissionInputValue.levelCount;
    const oldBinary = this._permissionInputValue.binary;
    let newBinary =
      oldBinary.slice(0, (levelCount - level - 1) * 8) +
      "11111111" +
      oldBinary.slice((levelCount - level) * 8);
    const newDecimal = parseInt(newBinary, 2);
    this._permissionInputValue.binary = newBinary;
    this._permissionInputValue.decimal = newDecimal;
    this._renderEditTableBody();
  }
  _disallowRow(evt) {
    const level = +evt.target.dataset.level;
    if (isNaN(level)) return;

    this._quickFillInput.setValue("");
    const levelCount = this._permissionInputValue.levelCount;
    const oldBinary = this._permissionInputValue.binary;
    let newBinary =
      oldBinary.slice(0, (levelCount - level - 1) * 8) +
      "00000000" +
      oldBinary.slice((levelCount - level) * 8);
    const newDecimal = parseInt(newBinary, 2);
    this._permissionInputValue.binary = newBinary;
    this._permissionInputValue.decimal = newDecimal;
    this._renderEditTableBody();
  }

  _changePermissionInput() {
    this._quickFillInput.setValue("");

    const newDecimal = this._permissionInput.getValue();
    this._permissionInputValue.decimal = newDecimal;

    const binary = newDecimal.toString(2);
    // If binary's length is smaller than level count defined in BYTE_COUNT, then pad it with "0"s
    this._permissionInputValue.binary = this._padToAnyBits(
      this._permissionInputValue.levelCount * 8,
      binary
    );

    this._renderEditTableBody();
  }

  _changeQuickFillInput() {
    const quickFillValue = this._quickFillInput.getValue();
    if (quickFillValue === "") return;

    console.log(
      this._data.targetType,
      quickFillValue,
      this._permissionMask.QUICK_FILL_PERMISSIONS
    );

    let newDecimal =
      this._permissionMask.QUICK_FILL_PERMISSIONS[this._data.targetType]?.[
        quickFillValue
      ];
    console.log("😇 ~ _changeQuickFillInput ~ newDecimal:", newDecimal);
    if (typeof newDecimal === "undefined") {
      const levelCount = this._permissionInputValue.levelCount;
      const binary = "-".repeat(levelCount * 8);

      this._permissionInputValue.decimal = null;
      this._permissionInputValue.binary = binary;
    } else {
      this._permissionInputValue.decimal = newDecimal;

      const binary = newDecimal.toString(2);
      // If binary's level count is smaller than it defined in BYTE_COUNT, then pad it with "0"s
      this._permissionInputValue.binary = this._padToAnyBits(
        this._permissionInputValue.levelCount * 8,
        binary
      );
    }

    this._renderEditTableBody();
  }

  async _saveForm(evt) {
    evt.preventDefault();

    // Create a new policy
    if (this._id === "New") {
      try {
        const body = {
          [this._data.targetType]: this._data.targetId,
          [this._data.entityType]: this._data.entityId,
          permission: Number(this._permissionInputValue.decimal),
        };
        const responseInfo = await store.getState().createPolicy(body);

        console.log("😇 ~ responseInfo ~ responseInfo:", responseInfo);
        this.handleResponse(responseInfo);
      } catch (err) {
        this.modal._error(err);
      }
    }
    // Edit a policy
    else {
      this._openUpdatePolicyModal();
    }
  }

  _resetTable() {
    const policy = this._data;

    if (this._id === "New") {
      const levelCount = BYTE_COUNT[policy.targetType];
      const binary = "-".repeat(levelCount * 8);
      const decimal = null;

      this._permissionInputValue.binary = binary;
      this._permissionInputValue.decimal = decimal;
      this._permissionInputValue.levelCount = levelCount;

      this._renderEditTableBody();
    } else {
      this._permissionInputValue.decimal = policy.permission;

      const binary = policy.permission.toString(2);
      // If binary's level count is smaller than it defined in BYTE_COUNT, then pad it with "0"s
      const levelCount = Math.max(
        Math.ceil(binary.length / 8),
        BYTE_COUNT[policy.targetType]
      );

      this._permissionInputValue.binary = this._padToAnyBits(
        levelCount * 8,
        binary
      );
      this._permissionInputValue.levelCount = levelCount;
      this._renderEditTableBody();
    }
  }

  _initInputs() {
    this._entityTypeInput.choices = ENTITY_TYPE_CHOICES;
    this._targetTypeInput.choices = TARGET_TYPE_CHOICES;
  }

  _getQuickFillChoices() {
    const keys = Object.keys(
      this._permissionMask.QUICK_FILL_PERMISSIONS[this._targetType]
    );
    const choices = [{ label: "Not Selected", value: "" }];
    keys.forEach((key) => {
      choices.push({ label: key, value: key });
    });
    console.log(choices);
    return choices;
  }

  _inputChange() {
    const values = this._inputs.map((input) => {
      return [input.dataset.key, input.getValue()];
    });

    if (values.some((value) => !value[1])) return;

    this._initByInputs(Object.fromEntries(values));
  }

  _openUpdatePolicyModal() {
    const button = document.createElement("button");
    button.setAttribute("class", "btn btn-clear f1 text-semibold btn-red");

    let confirmText = document.createTextNode("Confirm");
    button.appendChild(confirmText);

    button.addEventListener("click", this._updatePolicy.bind(this));
    this._setUpWarningMsg("PATCH");

    this.modal._confirm({
      titleText: `Update Confirmation`,
      mainText: this._modalWarningMessage,
      buttonSave: button,
    });
  }

  async _openDeletePolicyModal() {
    const button = document.createElement("button");
    button.setAttribute("class", "btn btn-clear f1 text-semibold btn-red");

    let confirmText = document.createTextNode("Confirm");
    button.appendChild(confirmText);

    button.addEventListener("click", this._deletePolicy.bind(this));
    this._setUpWarningMsg("DELETE");

    this.modal._confirm({
      titleText: `Delete Confirmation`,
      mainText: this._modalWarningMessage,
      buttonSave: button,
    });
  }

  _setUpWarningMsg(method) {
    if (method === "DELETE") {
      this._modalWarningMessage = `
      Pressing confirm will create this policy:<br/><br/><br/>
      ID: ${this._data.id}, ${this._requestedEntityName} against ${this._requestedTargetName}.<br/><br/><br/>
      Do you want to continue?
      `;
    } else if (method === "PATCH") {
      this._modalWarningMessage = `
      Pressing confirm will update this policy:<br/><br/><br/>
      ID: ${this._data.id}, ${this._requestedEntityName} against ${this._requestedTargetName}.<br/><br/>
      From ${this._data.permission} to ${this._permissionInputValue.decimal}.<br/><br/><br/>
      Do you want to continue?
      `;
    }
  }

  async _updatePolicy() {
    const { id } = this._data;

    this.modal._modalCloseAndClear();
    try {
      const responseInfo = await store
        .getState()
        .updatePolicy(id, Number(this._permissionInputValue.decimal));
      this.handleResponse(responseInfo);
    } catch (err) {
      this.modal._error(err);
    }
  }

  async _deletePolicy() {
    const { id } = this._data;

    this.modal._modalCloseAndClear();
    try {
      const responseInfo = await store.getState().deletePolicy(id);
      this.handleResponse(responseInfo);
    } catch (err) {
      this.modal._error(err);
    }
  }

  handleResponse(info) {
    let message = info.data?.message ? info.data.message : "";
    if (info.response?.ok) {
      store.getState().setPolicyData();
      return this.modal._success(message);
    } else {
      if (info.response?.status) {
        return this.modal._error(
          `<strong>${info.response.status}</strong><br/><br/>${message}`
        );
      } else {
        return this.modal._error(`Error: Could not process request.`);
      }
    }
  }

  _bitwiseOrBinaryStrings(binaryStrings) {
    const validBinaryStrings = binaryStrings.filter((str) => str !== "");

    if (validBinaryStrings.length === 0) return "";

    let result = parseInt(validBinaryStrings[0], 2);

    for (let i = 1; i < validBinaryStrings.length; i++) {
      result |= parseInt(validBinaryStrings[i], 2);
    }

    return result.toString(2).padStart(8, "0");
  }

  _getRightmost8Bits(binaryStr) {
    // If the binary string is shorter than 8 bits, pad it with leading zeros
    const paddedBinaryStr = binaryStr.padStart(8, "0");

    // Return the rightmost 8 bits
    return paddedBinaryStr.slice(-8);
  }

  _padToAnyBits(targetLength, binaryStr) {
    return binaryStr.padStart(targetLength, "0");
  }

  _splitIntoChunksOf8Chars(str) {
    let chunks = [];
    for (let i = 0; i < str.length; i += 8) {
      chunks.push(str.substring(i, i + 8));
    }
    return chunks;
  }

  /**
   * Modal for this page, and handler
   * @returns sets page attribute that changes dimmer
   */
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }
}

customElements.define("policy-single-view", PolicySingleView);

class PermissionMask {
  constructor() {
    // These bits are repeated so the left-byte is for children objects. This allows
    // a higher object to store the default permission for children objects by bitshifting by the
    // level of abstraction.
    // [0:7] Self-level objects (projects, algos, versions)
    // [8:15] Children objects (project -> section* -> media -> metadata)
    // [16:23] Grandchildren objects (project -> section -> media* -> metadata)
    // [24:31] Great-grandchildren objects (project -> section -> media -> metadata*)
    // If a permission points to a child object, that occupies [0:7]
    // Permission objects exist against either projects, algos, versions or sections

    this.EXIST = BigInt(0x1); // Allows a row to be seen in a list, or individual GET
    this.READ = BigInt(0x2); // Allows a references to be accessed, e.g. generate presigned URLs
    this.CREATE = BigInt(0x4); // Allows a row to be created (e.g. POST)
    this.MODIFY = BigInt(0x8); // Allows a row to be PATCHED (but not in-place, includes variant delete)
    this.DELETE = BigInt(0x10); // Allows a row to be deleted (pruned for metadata)
    this.EXECUTE = BigInt(0x20); // Allows an algorithm to be executed (applies to project-level or algorithm)
    this.UPLOAD = BigInt(0x40); // Allows media to be uploaded
    this.ACL = BigInt(0x80); // Allows ACL modification for a row, if not a creator
    this.FULL_CONTROL = BigInt(0xff); // All bits and all future bits are set

    this.QUICK_FILL_PERMISSIONS = {
      project: {
        "Full Control":
          (this.FULL_CONTROL << 32n) |
          (this.FULL_CONTROL << 24n) |
          (this.FULL_CONTROL << 16n) |
          (this.FULL_CONTROL << 8n) |
          this.FULL_CONTROL,
        "No Access": 0,
      },
      media: {
        "No Access": 0,
      },
      localization: {
        "No Access": 0,
      },
      state: {
        "No Access": 0,
      },
      file: {
        "No Access": 0,
      },
      section: {
        "Full Control":
          (this.FULL_CONTROL << 16n) |
          (this.FULL_CONTROL << 8n) |
          this.FULL_CONTROL,
        Admin:
          ((this.EXIST |
            this.READ |
            this.MODIFY |
            this.CREATE |
            this.DELETE |
            this.ACL) <<
            16n) |
          ((this.EXIST |
            this.READ |
            this.MODIFY |
            this.CREATE |
            this.DELETE |
            this.UPLOAD |
            this.ACL) <<
            8n) |
          (this.EXIST |
            this.READ |
            this.MODIFY |
            this.CREATE |
            this.DELETE |
            this.ACL),
        Editor:
          ((this.EXIST | this.READ | this.MODIFY | this.CREATE | this.DELETE) <<
            16n) |
          ((this.EXIST |
            this.READ |
            this.MODIFY |
            this.CREATE |
            this.DELETE |
            this.UPLOAD) <<
            8n) |
          (this.EXIST | this.READ | this.MODIFY | this.CREATE | this.DELETE),
        Annotator:
          ((this.EXIST | this.READ | this.MODIFY | this.CREATE | this.DELETE) <<
            16n) |
          ((this.EXIST | this.READ) << 8n) |
          (this.EXIST | this.READ),
        Verifier:
          ((this.EXIST | this.READ | this.MODIFY) << 16n) |
          ((this.EXIST | this.READ) << 8n) |
          (this.EXIST | this.READ),
        Viewer:
          ((this.EXIST | this.READ) << 16n) |
          ((this.EXIST | this.READ) << 8n) |
          (this.EXIST | this.READ),
        "No Access": 0,
      },
      algorithm: {
        "Full Control": this.FULL_CONTROL,
        "No Access": 0,
      },
      version: {
        "Full Control": (this.FULL_CONTROL << 8n) | this.FULL_CONTROL,
        "No Access": 0,
      },
      target_organization: {
        "Full Control":
          (this.FULL_CONTROL << 32n) |
          (this.FULL_CONTROL << 24n) |
          (this.FULL_CONTROL << 16n) |
          (this.FULL_CONTROL << 8n) |
          this.FULL_CONTROL,
        "No Access": 0,
      },
      target_group: {
        "Full Control": this.FULL_CONTROL,
        "No Access": 0,
      },
      job_cluster: {
        "No Access": 0,
      },
      bucket: {
        "No Access": 0,
      },
      template: {
        "Full Control": this.FULL_CONTROL,
        "No Access": 0,
      },
    };
  }
}
