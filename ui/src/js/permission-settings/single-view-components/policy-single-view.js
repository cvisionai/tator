import { TatorElement } from "../../components/tator-element.js";
import {
  POLICY_ENTITY_NAME,
  POLICY_TARGET_NAME,
  store,
  fetchWithHttpInfo,
} from "../store.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";

const EDIT_COLUMN = [
  "Level",
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
  // { label: "Media", value: "media" },
  // { label: "File", value: "file" },
  { label: "Section", value: "section" },
  // { label: "Algorithm", value: "algorithm" },
  { label: "Version", value: "version" },
  // { label: "Organization", value: "target_organization" },
  // { label: "Group", value: "target_group" },
  // { label: "Bucket", value: "bucket" },
  // { label: "Hosted Template", value: "hosted_template" },
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

    // // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
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

    this._permissionInput.addEventListener(
      "change",
      this._changePermissionInput.bind(this)
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

    // New policy
    if (this._id === "New") {
      this._initInputs(true);
      this._title.innerText = "New Policy";
      this._noPermission.setAttribute("hidden", "");
    }
    // Edit policy
    else {
      this._initInputs(false);
      this._title.innerText = "Edit Policy";
      this._noPermission.setAttribute("hidden", "");
    }

    this._setData();
  }

  _setData() {
    if (!this._show) return;
    const { Policy } = store.getState();
    if (!Policy.init) return;

    if (this.hasAttribute("has-open-modal")) {
      this.hideDimmer();
      this.loading.hideSpinner();
    }

    // New policy
    if (this._id === "New") {
      this._initByData();
    }
    // Edit policy
    else {
      this._initByData(Policy.processedMap.get(+this._id));
    }
  }

  /**
   * @param {object} val
   */
  async _initByData(val) {
    console.log("😇 ~ _initByData ~ val:", val, this._id);

    this._noData.setAttribute("hidden", "");
    this._noPermission.setAttribute("hidden", "");
    this._permissionInput.permission = "Can Edit";
    this._permissionInput.setValue(null);
    this._saveReset.style.display = "none";
    this._tableHead.innerHTML = "";
    this._tableBody.innerHTML = "";

    if (val) {
      this._data = val;

      this.showDimmer();
      this.loading.showSpinner();

      this._entityTypeInput.setValue(val.entityType);
      this._entityIdInput.setValue(val.entityId);
      this._targetTypeInput.setValue(val.targetType);
      this._targetIdInput.setValue(val.targetId);

      this._requestedEntityName = `${
        POLICY_ENTITY_NAME[this._entityTypeInput.getValue()]
      } ${this._entityIdInput.getValue()}`;
      this._requestedTargetName = `${
        POLICY_TARGET_NAME[this._targetTypeInput.getValue()]
      } ${this._targetIdInput.getValue()}`;

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
        // Cannot find in states, then manually fetch
        this._data = await this._getDataById();

        this._processPermission();
        // this._noData.removeAttribute("hidden");
        // this._noData.innerText = `There is no data for Policy ${this._id}.`;

        // if (this.hasAttribute("has-open-modal")) {
        //   this.hideDimmer();
        //   this.loading.hideSpinner();
        // }
      }
    }
  }

  async _getDataByInputs() {
    const entityType = this._entityTypeInput.getValue();
    const entityId = this._entityIdInput.getValue();
    const targetType = this._targetTypeInput.getValue();
    const targetId = this._targetIdInput.getValue();

    const {
      Policy: { processedData },
    } = store.getState();
    const data = processedData.find((policy) => {
      return (
        policy.entityName === this._requestedEntityName &&
        policy.targetName === this._requestedTargetName
      );
    });

    if (data) {
      return data;
    } else {
      const policies = await store
        .getState()
        .getPoliciesByTargets([[targetType, targetId]]);

      // No policy exists
      if (!policies.length) {
        return {
          id: null,
          permission: null,
          entityId,
          entityType,
          targetType,
          targetId,
          entityName: this._requestedEntityName,
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
          entityId,
          entityType,
          targetType,
          targetId,
          entityName: this._requestedEntityName,
          targetName: this._requestedTargetName,
        };
      }
    }
  }

  async _getDataById() {
    // Fetch Policy
    try {
      const data = await store.getState().getPolicyById(+this._id);

      console.log("😇 ~ _getDataById ~ data:", data);

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
        this._permissionInput.permission = "Can Edit";
        this._noData.setAttribute("hidden", "");
        this._noPermission.setAttribute("hidden", "");

        this._permissionInputValue = {};
        // Head
        this._renderEditTableHead();
        // Body
        this._resetTable();

        this._saveReset.style.display = "";
        // this._checkPermissionOnOperatePolicy();
        if (this.hasAttribute("has-open-modal")) {
          this.hideDimmer();
          this.loading.hideSpinner();
        }
      }
      // policy not permitted to fetch
      else if (this._data.permission === -1) {
        this._permissionInput.permission = "View Only";
        this._noPermission.removeAttribute("hidden");
        this._noPermission.innerText = `You don't have permission to create new policy towards ${this._requestedTargetName}.`;

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
        this._permissionInput.setAttribute("hidden", "");
        this._noData.removeAttribute("hidden");
        this._noData.innerText = `There is no data for Policy ${this._id}.`;
      }
      // policy not permitted to fetch
      else if (this._data.permission === -1) {
        this._permissionInput.permission = "View Only";
        this._noPermission.removeAttribute("hidden");
        this._noPermission.innerText = `You don't have permission to edit Policy ${this._id}.`;
      }
      // policy data fetched
      else {
        // Fill the inputs
        this._entityTypeInput.setValue(this._data.entityType);
        this._entityIdInput.setValue(this._data.entityId);
        this._targetTypeInput.setValue(this._data.targetType);
        this._targetIdInput.setValue(this._data.targetId);

        this._permissionInputValue = {};
        // Head
        this._renderEditTableHead();
        // Body
        this._resetTable();

        this._saveReset.style.display = "";
        // this._checkPermissionOnOperatePolicy();
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
      tdSc.innerText = `123`;
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
  _changePermissionInput() {
    const newDecimal = this._permissionInput.getValue();
    this._permissionInputValue.decimal = newDecimal;

    const binary = newDecimal.toString(2);
    // If binary's level count is smaller than it defined in BYTE_COUNT, then pad it with "0"s
    this._permissionInputValue.binary = this._padToAnyBits(
      this._permissionInputValue.levelCount * 8,
      binary
    );

    this._renderEditTableBody();
  }

  _checkPermissionOnOperatePolicy() {
    for (const [targetName, policies] of this._singleRowData) {
      const noPermission = Array.from(policies.values()).some(
        (policy) => policy.permission === -1
      );
      if (noPermission) {
        if (this._id.startsWith("Cal")) {
          const actionButtons = this._tableBody.querySelectorAll(
            `[data-id^="${targetName}"]`
          );
          actionButtons.forEach((btn) => btn.setAttribute("disabled", ""));
        } else {
          this._noPermission.removeAttribute("hidden");
          this._noPermission.innerText = `You don't have permission to create new policy on ${this._requestedEntityName} against ${this._requestedTargetName}.`;
          this._saveReset.style.display = "none";
          this._permissionInput.permission = "View Only";
        }
      }
    }
  }

  _saveForm(evt) {
    evt.preventDefault();

    if (this._id === "New") {
    } else {
      const policyToBeCreated = [];
      const policyToBeDeleted = [];
      const policyToBeEdited = [];
      for (const [targetName, policies] of this._singleRowData) {
        for (const [entityName, policy] of policies) {
          if (policy.permissionBits !== policy.originalPermissionBits) {
            if (policy.originalPermissionBits === "--------") {
              policyToBeCreated.push(policy);
            } else if (policy.permissionBits === "--------") {
              policyToBeDeleted.push(policy);
            } else {
              policyToBeEdited.push(policy);
            }
          }
        }
      }

      this._calculateChanges(
        policyToBeCreated,
        policyToBeDeleted,
        policyToBeEdited
      );
    }
  }

  _calculateChanges(policyToBeCreated, policyToBeDeleted, policyToBeEdited) {
    const toBeCreated = [];
    const toBeDeleted = [];
    const toBeEdited = [];
    policyToBeEdited.forEach((policy) => {
      const target = this.targets.find(
        (target) => target[0] === policy.targetType
      );

      const newBinaryPermissionOnTarget = this._getRightmost8Bits(
        BigInt(`0b${policy.permissionBits}`).toString(2)
      );

      const binaryPermission = this._padToAnyBits(
        8,
        BigInt(policy.permission).toString(2)
      );

      const newBinaryPermission = `${binaryPermission.slice(
        0,
        -target[2] - 8
      )}${newBinaryPermissionOnTarget}${
        target[2] === 0 ? "" : `${binaryPermission.slice(-target[2])}`
      }`;

      const newPermission = parseInt(newBinaryPermission, 2);
      console.log(newPermission);
    });
  }

  _setUpWarningSavingMsg() {
    this._warningDeleteMessage = `
    Pressing confirm will create these policies:<br/><br/>
    ${1}
    <br/>
    <br/><br/>
    Do you want to continue?
    `;
    return this._warningDeleteMessage;
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

  _initInputs(canEdit) {
    this._entityTypeInput.choices = ENTITY_TYPE_CHOICES;
    this._targetTypeInput.choices = TARGET_TYPE_CHOICES;

    if (canEdit) {
      this._entityTypeInput.permission = "Can Edit";
      this._entityIdInput.permission = "Can Edit";
      this._targetTypeInput.permission = "Can Edit";
      this._targetIdInput.permission = "Can Edit";
    } else {
      this._entityTypeInput.permission = "View Only";
      this._entityIdInput.permission = "View Only";
      this._targetTypeInput.permission = "View Only";
      this._targetIdInput.permission = "View Only";
    }
  }

  _inputChange() {
    const values = this._inputs.map((input) => {
      return [input.dataset.key, input.getValue()];
    });

    if (values.some((value) => !value[1])) return;

    this._initByData(Object.fromEntries(values));
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
  // These bits are repeated so the left-byte is for children objects. This allows
  // a higher object to store the default permission for children objects by bitshifting by the
  // level of abstraction.
  // [0:7] Self-level objects (projects, algos, versions)
  // [8:15] Children objects (project -> section* -> media -> metadata)
  // [16:23] Grandchildren objects (project -> section -> media* -> metadata)
  // [24:31] Great-grandchildren objects (project -> section -> media -> metadata*)
  // If a permission points to a child object, that occupies [0:7]
  // Permission objects exist against either projects, algos, versions or sections

  static EXIST = 0x1; // Allows a row to be seen in a list, or individual GET
  static READ = 0x2; // Allows a references to be accessed, e.g. generate presigned URLs
  static CREATE = 0x4; // Allows a row to be created (e.g. POST)
  static MODIFY = 0x8; // Allows a row to be PATCHED (but not in-place, includes variant delete)
  static DELETE = 0x10; // Allows a row to be deleted (pruned for metadata)
  static EXECUTE = 0x20; // Allows an algorithm to be executed (applies to project-level or algorithm)
  static UPLOAD = 0x40; // Allows media to be uploaded
  static ACL = 0x80; // Allows ACL modification for a row, if not a creator
  static FULL_CONTROL = 0xff; // All bits and all future bits are set
}
