import { TatorElement } from "../../components/tator-element.js";
import {
  POLICY_ENTITY_NAME,
  POLICY_TARGET_NAME,
  store,
  fetchWithHttpInfo,
} from "../store.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";

const COLUMN = [
  "Policy Entity",
  "Policy Target",
  "Exist",
  "Read",
  "Create",
  "Modify",
  "Delete",
  "Execute",
  "Upload",
  "ACL",
  "Actions",
];
const COLGROUP = `
<col style="width: 13%" />
<col style="width: 13%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 10%" />
`;

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

export class PermissionSettingsPolicyCalculatorView extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("policy-calculator-view").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._title = this._shadow.getElementById("title");
    this._noData = this._shadow.getElementById("no-data");

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

    this._table = this._shadow.getElementById("calculator-table");
    this._colgroup = this._shadow.getElementById("calculator-table--colgroup");
    this._tableHead = this._shadow.getElementById("calculator-table--head");
    this._tableBody = this._shadow.getElementById("calculator-table--body");
    this._colgroup.innerHTML = COLGROUP;

    this._form = this._shadow.getElementById("calculator-table-form");
    this._saveReset = this._shadow.getElementById(
      "calculator-table--save-reset-section"
    );
    this._saveButton = this._shadow.getElementById("calculator-table-save");
    this._resetButton = this._shadow.getElementById("calculator-table-reset");

    // // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
  }

  connectedCallback() {
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
  }

  _updateSelectedType(newSelectedType, oldSelectedType) {
    if (
      newSelectedType.typeName !== "Policy" ||
      newSelectedType.typeId === "All"
    ) {
      this._show = false;
      return;
    }

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
      this._title.innerText = "New Policy";
    }
    // Calculator (with no entity and target info preset)
    else if (this._id === "Cal") {
      this._entityTypeInput.permission = "Can Edit";
      this._entityIdInput.permission = "Can Edit";
      this._targetTypeInput.permission = "Can Edit";
      this._targetIdInput.permission = "Can Edit";
      this._title.innerText = "Effective Permission Calculator";
    }
    // Calculator (with entity and target info preset)
    else {
      this._entityTypeInput.permission = "View Only";
      this._entityIdInput.permission = "View Only";
      this._targetTypeInput.permission = "View Only";
      this._targetIdInput.permission = "View Only";
      this._title.innerText = "Effective Permission Calculator";
    }

    this._setData();
  }

  _setData() {
    if (!this._show) return;
    const { Policy } = store.getState();
    if (!Policy.init) return;

    // New policy
    if (this._id === "New") {
    }
    // Calculator (with no entity and target info preset)
    else if (this._id === "Cal") {
      this._initByData({});
    }
    // Calculator (with entity and target info preset)
    else {
      this._initByData(Policy.processedMap.get(+this._id));
    }
  }

  /**
   * @param {object} val
   */
  _initByData(val) {
    this._noData.setAttribute("hidden", "");
    this._saveReset.style.display = "none";
    this._tableHead.innerHTML = "";
    this._tableBody.innerHTML = "";

    if (val) {
      this._data = val;

      // Calculator
      if (Object.keys(val).length === 0) {
        this._entityIdInput.setValue(null);
        this._targetIdInput.setValue(null);
      }
      // Calculator (with entity and target info)
      else {
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

        this._renderData();
      }
    }
    // policy id is invalid or no policy data
    else {
      this._noData.removeAttribute("hidden");
      this._noData.innerText = `There is no data for Policy ${this._id}.`;

      if (this.hasAttribute("has-open-modal")) {
        this.hideDimmer();
        this.loading.hideSpinner();
      }
    }
  }

  async _renderData() {
    const {
      Policy: { processedData },
    } = store.getState();

    // Fetch Policy
    let targets = null;
    try {
      targets = await this._getCalculatorTargets();
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

    const entities = this._getCalculatorEntities();
    const calculatorPolicies = await store
      .getState()
      .getCalculatorPolicies(targets);
    this._getTableBodyData(entities, targets, calculatorPolicies);

    this._ordRowPermissionStrings = new Map();

    // Head
    this._renderTableHead();

    // Body -- Create Row
    Array.from(this._tableBodyData.entries()).forEach(
      ([targetName, policies]) => {
        Array.from(policies.keys()).forEach((entityName) => {
          // single policy row
          const tr = document.createElement("tr");
          tr.id = `${targetName}--${entityName}`;
          this._tableBody.appendChild(tr);
        });

        // OR'd row
        const tr = document.createElement("tr");
        tr.id = `${targetName}--ord`;
        this._tableBody.appendChild(tr);
      }
    );
    //// final effective permission Row
    const tr = document.createElement("tr");
    tr.id = `final-row`;
    this._tableBody.appendChild(tr);

    // Body -- Fill in data
    Array.from(this._tableBodyData.entries()).forEach(
      ([targetName, policies]) => {
        Array.from(policies.keys()).forEach((entityName) => {
          this._renderTableBodyRow(targetName, entityName);
        });
        this._renderTableBodyOrdRow(targetName);
      }
    );
    this._renderTableBodyFinalRow();

    this._saveReset.style.display = "";
    if (this.hasAttribute("has-open-modal")) {
      this.hideDimmer();
      this.loading.hideSpinner();
    }
  }

  _renderTableBodyRow(targetName, entityName) {
    const id = `${targetName}--${entityName}`;
    const tr = document.createElement("tr");
    tr.id = id;

    const tdEntity = document.createElement("td");
    tdEntity.innerText = entityName;
    tr.appendChild(tdEntity);

    const isFirstRow =
      Array.from(this._tableBodyData.get(targetName).keys()).indexOf(
        entityName
      ) === 0;
    if (isFirstRow) {
      const entityCount = this._tableBodyData.get(targetName).size;
      const tdTarget = document.createElement("td");
      tdTarget.innerText = targetName;
      tdTarget.setAttribute("rowspan", entityCount);
      tr.appendChild(tdTarget);
    }

    const { permission } = this._tableBodyData.get(targetName).get(entityName);
    const noACL = permission === "-------0";
    permission.split("").forEach((char, index) => {
      const td = document.createElement("td");
      if (char === "0") {
        if (!noACL) {
          const xmark = document.createElement("no-permission-button");
          xmark.setAttribute("data-id", `${id}--${index}`);
          xmark.addEventListener("click", this._changeRowCell.bind(this));
          td.appendChild(xmark);
        }
      } else if (char === "1") {
        const check = document.createElement("has-permission-button");
        check.setAttribute("data-id", `${id}--${index}`);
        check.addEventListener("click", this._changeRowCell.bind(this));
        td.appendChild(check);
      }
      tr.appendChild(td);
    });

    const tdActions = document.createElement("td");
    const div = document.createElement("div");
    div.classList.add("d-flex", "flex-row", "flex-justify-center");
    div.style.gap = "5px";
    tdActions.appendChild(div);
    tr.appendChild(tdActions);

    const back = document.createElement("change-back-button");
    back.setAttribute("data-id", `${targetName}--${entityName}`);
    back.addEventListener("click", this._changeRowBack.bind(this));
    div.appendChild(back);
    if (permission === "--------") {
      const grant = document.createElement("grant-all-button");
      grant.setAttribute("data-id", `${targetName}--${entityName}`);
      grant.addEventListener("click", this._grantRow.bind(this));
      div.appendChild(grant);
    } else {
      const remove = document.createElement("remove-permission-button");
      remove.setAttribute("data-id", `${targetName}--${entityName}`);
      remove.addEventListener("click", this._removeRow.bind(this));
      div.appendChild(remove);
    }
    if (noACL) {
      for (const child of div.children) {
        child.setAttribute("disabled", "");
      }
    }

    const trOld = this._shadow.getElementById(id);
    this._tableBody.replaceChild(tr, trOld);
  }

  _renderTableBodyOrdRow(targetName) {
    const id = `${targetName}--ord`;
    const tr = document.createElement("tr");
    tr.id = id;
    tr.classList.add("ord-row");

    const td = document.createElement("td");
    td.innerText = `${this._requestedEntityName}'s effective permission against ${targetName}`;
    td.setAttribute("colspan", 2);
    tr.appendChild(td);

    let ordPermission = "";
    const permissionStrings = Array.from(
      this._tableBodyData.get(targetName).values()
    ).map((obj) => obj.permission);

    if (permissionStrings[0] === "-------0") {
      ordPermission = "-------0";
      td.innerText += `\nYou don't have permission to fetch data of ${targetName}.`;
    } else {
      ordPermission = this._bitwiseOrBinaryStrings(permissionStrings);
    }

    this._ordRowPermissionStrings.set(targetName, ordPermission);

    ordPermission.split("").forEach((char) => {
      const td = document.createElement("td");
      if (char === "0") {
        const xmark = document.createElement("no-permission-button");
        xmark.setAttribute("disabled", "");
        td.appendChild(xmark);
      } else if (char === "1") {
        const check = document.createElement("has-permission-button");
        check.setAttribute("disabled", "");
        td.appendChild(check);
      } else if (char === "-") {
        const question = document.createElement("question-mark-button");
        question.setAttribute("disabled", "");
        td.appendChild(question);
      }
      tr.appendChild(td);
    });

    const tdActions = document.createElement("td");
    tr.appendChild(tdActions);

    const trOld = this._shadow.getElementById(id);
    this._tableBody.replaceChild(tr, trOld);
  }

  _renderTableBodyFinalRow() {
    const id = `final-row`;
    const tr = document.createElement("tr");
    tr.id = id;
    tr.classList.add("final-row");

    const td = document.createElement("td");
    td.innerText = `${this._requestedEntityName}'s final effective permission against ${this._requestedTargetName}`;
    td.setAttribute("colspan", 2);
    tr.appendChild(td);

    const finalPermission = Array.from(
      this._ordRowPermissionStrings.values()
    ).at(-1);

    finalPermission.split("").forEach((char) => {
      const td = document.createElement("td");
      if (char === "0") {
        const xmark = document.createElement("no-permission-button");
        xmark.setAttribute("disabled", "");
        td.appendChild(xmark);
      } else if (char === "1") {
        const check = document.createElement("has-permission-button");
        check.setAttribute("disabled", "");
        td.appendChild(check);
      } else if (char === "-") {
        const question = document.createElement("question-mark-button");
        question.setAttribute("disabled", "");
        td.appendChild(question);
      }
      tr.appendChild(td);
    });

    const tdActions = document.createElement("td");
    tr.appendChild(tdActions);

    const trOld = this._shadow.getElementById(id);
    this._tableBody.replaceChild(tr, trOld);
  }

  _renderTableHead() {
    // Head row 1
    const tr1 = document.createElement("tr");

    const th0 = document.createElement("th");
    th0.innerText = COLUMN[0];
    th0.setAttribute("rowspan", 2);
    tr1.appendChild(th0);

    const th1 = document.createElement("th");
    th1.innerText = COLUMN[1];
    th1.setAttribute("rowspan", 2);
    tr1.appendChild(th1);

    const ths = document.createElement("th");
    ths.innerText = `Each policy's permission on ${this._requestedTargetName} (with corresponding bit shift)`;
    ths.setAttribute("colspan", 8);
    tr1.appendChild(ths);

    const thLast = document.createElement("th");
    thLast.innerText = COLUMN.at(-1);
    thLast.setAttribute("rowspan", 2);
    tr1.appendChild(thLast);

    this._tableHead.appendChild(tr1);

    // Head row 2
    const tr2 = document.createElement("tr");
    COLUMN.slice(2, COLUMN.length - 1)
      .map((val) => {
        const th = document.createElement("th");
        th.innerText = val;
        return th;
      })
      .forEach((th) => {
        tr2.appendChild(th);
      });
    this._tableHead.appendChild(tr2);
  }

  _getTableBodyData(entities, targets, policies) {
    console.log("😇 ~ _getTableBodyData ~ policies:", policies);

    this._tableBodyData = new Map();

    targets.forEach((target) => {
      const targetName = `${POLICY_TARGET_NAME[target[0]]} ${target[1]}`;
      this._tableBodyData.set(targetName, new Map());

      if (
        policies.findIndex(
          (policy) =>
            policy.entityName === "ALL" && policy.targetName === targetName
        ) > -1
      ) {
        entities.forEach((entity) => {
          const entityName = `${POLICY_ENTITY_NAME[entity[0]]} ${entity[1]}`;

          let binaryShiftedPermission = "-------0";
          const obj = {
            policyId: null,
            permission: binaryShiftedPermission,
            originalPermission: binaryShiftedPermission,
          };

          this._tableBodyData.get(targetName).set(entityName, obj);
        });
      } else {
        entities.forEach((entity) => {
          const entityName = `${POLICY_ENTITY_NAME[entity[0]]} ${entity[1]}`;

          let binaryShiftedPermission = "--------";
          let policyId = null;
          const policy = policies.find(
            (policy) =>
              policy.entityName === entityName &&
              policy.targetName === targetName
          );
          if (policy) {
            policyId = policy.id;
            const permission = BigInt(policy.permission);
            const shiftedPermission = permission >> BigInt(target[2]);
            // .split("").reverse().join(""): reverse the string, bc the rightmost is "Exist", the left most is "ACL". But in the table it is the opposite
            binaryShiftedPermission = this._getRightmost8Bits(
              shiftedPermission.toString(2)
            )
              .split("")
              .reverse()
              .join("");
          }
          const obj = {
            policyId,
            permission: binaryShiftedPermission,
            originalPermission: binaryShiftedPermission,
          };

          this._tableBodyData.get(targetName).set(entityName, obj);
        });
      }
    });

    console.log(
      "😇 ~ _getTableBodyData ~ this._tableBodyData :",
      this._tableBodyData
    );
  }

  _changeRowCell(evt) {
    const id = evt.target.dataset.id;
    if (id) {
      const val = id.split("--");
      if (val.length === 3) {
        const { permission } = this._tableBodyData.get(val[0]).get(val[1]);
        const index = +val[2];
        const bit = permission[index];

        const newPermission =
          permission.slice(0, index) +
          (bit === "1" ? "0" : "1") +
          permission.slice(index + 1);

        const oldObj = this._tableBodyData.get(val[0]).get(val[1]);
        this._tableBodyData
          .get(val[0])
          .set(val[1], { ...oldObj, permission: newPermission });

        this._renderTableBodyRow(val[0], val[1]);
        this._renderTableBodyOrdRow(val[0]);
        this._renderTableBodyFinalRow();
      }
    }
  }

  _changeRowBack(evt) {
    const id = evt.target.dataset.id;
    if (id) {
      const val = id.split("--");
      if (val.length === 2) {
        const newPermission = this._tableBodyData
          .get(val[0])
          .get(val[1]).originalPermission;

        const oldObj = this._tableBodyData.get(val[0]).get(val[1]);
        this._tableBodyData
          .get(val[0])
          .set(val[1], { ...oldObj, permission: newPermission });

        this._renderTableBodyRow(val[0], val[1]);
        this._renderTableBodyOrdRow(val[0]);
        this._renderTableBodyFinalRow();
      }
    }
  }

  _grantRow(evt) {
    const id = evt.target.dataset.id;
    if (id) {
      const val = id.split("--");
      if (val.length === 2) {
        const newPermission = "11111111";

        const oldObj = this._tableBodyData.get(val[0]).get(val[1]);
        this._tableBodyData
          .get(val[0])
          .set(val[1], { ...oldObj, permission: newPermission });

        this._renderTableBodyRow(val[0], val[1]);
        this._renderTableBodyOrdRow(val[0]);
        this._renderTableBodyFinalRow();
      }
    }
  }

  _removeRow(evt) {
    const id = evt.target.dataset.id;
    if (id) {
      const val = id.split("--");
      if (val.length === 2) {
        const newPermission = "";

        const oldObj = this._tableBodyData.get(val[0]).get(val[1]);
        this._tableBodyData
          .get(val[0])
          .set(val[1], { ...oldObj, permission: newPermission });

        this._renderTableBodyRow(val[0], val[1]);
        this._renderTableBodyOrdRow(val[0]);
        this._renderTableBodyFinalRow();
      }
    }
  }

  _getCalculatorEntities() {
    const requestedEntityType = this._entityTypeInput.getValue();
    const requestedEntityId = this._entityIdInput.getValue();

    const {
      user,
      groupList,
      organizationList,
      Group: { userIdGroupIdMap },
    } = store.getState();

    const entities = [];

    if (requestedEntityType === "organization") {
      entities.push(["organization", requestedEntityId]);
    } else if (requestedEntityType === "group") {
      const group = groupList.find((gr) => gr.id === requestedEntityId);
      entities.push(["organization", group.organization__id]);
      entities.push(["group", requestedEntityId]);
    } else if (requestedEntityType === "user") {
      organizationList.forEach((org) => {
        entities.push(["organization", org.id]);
      });
      if (userIdGroupIdMap.has(requestedEntityId)) {
        userIdGroupIdMap.get(requestedEntityId).forEach((groupId) => {
          entities.push(["group", groupId]);
        });
      }
      entities.push(["user", requestedEntityId]);
    }

    return entities;
  }

  async _getCalculatorTargets() {
    const targetType = this._targetTypeInput.getValue();
    const targetId = this._targetIdInput.getValue();
    const targets = [];

    if (targetType === "project") {
      const response = await fetchWithHttpInfo(`/rest/Project/${targetId}`);

      if (response.response?.ok) {
        const project = response.data;
        targets.push(["project", project.id, 0]);
      } else {
        throw new Error(response.data?.message || "Could not fetch data.");
      }
    } else if (targetType === "section") {
      const response = await fetchWithHttpInfo(`/rest/Section/${targetId}`);

      if (response.response?.ok) {
        const section = response.data;
        targets.push(["project", section.project, 8]);
        targets.push(["section", section.id, 0]);
      } else {
        throw new Error(response.data?.message || "Could not fetch data.");
      }
    } else if (targetType === "version") {
      const response = await fetchWithHttpInfo(`/rest/Version/${targetId}`);

      if (response.response?.ok) {
        const version = response.data;
        targets.push(["project", version.project, 8]);
        targets.push(["version", version.id, 0]);
      } else {
        throw new Error(response.data?.message || "Could not fetch data.");
      }
    }

    return targets;
  }

  _saveForm(evt) {
    evt.preventDefault();

    for (const [targetName, policies] of this._tableBodyData) {
      for (const [entityName, obj] of policies) {
        if (obj.permission !== obj.originalPermission) {
          console.log(targetName, entityName, obj);
        }
      }
    }
  }

  _initInputs() {
    this._entityTypeInput.choices = ENTITY_TYPE_CHOICES;
    this._targetTypeInput.choices = TARGET_TYPE_CHOICES;
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

customElements.define(
  "permission-settings-policy-calculator-view",
  PermissionSettingsPolicyCalculatorView
);
