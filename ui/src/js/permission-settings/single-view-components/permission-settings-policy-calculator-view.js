import { TatorElement } from "../../components/tator-element.js";
import { POLICY_ENTITY_NAME, POLICY_TARGET_NAME, store } from "../store.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

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

    this._entityTypeInput = this._shadow.getElementById("entity-type-input");
    this._entityIdInput = this._shadow.getElementById("entity-id-input");
    this._targetTypeInput = this._shadow.getElementById("target-type-input");
    this._targetIdInput = this._shadow.getElementById("target-id-input");

    this._table = this._shadow.getElementById("calculator-table");
    this._colgroup = this._shadow.getElementById("calculator-table--colgroup");
    this._tableHead = this._shadow.getElementById("calculator-table--head");
    this._tableBody = this._shadow.getElementById("calculator-table--body");
    this._colgroup.innerHTML = COLGROUP;

    this._form = this._shadow.getElementById("calculator-table-form");
    this._saveButton = this._shadow.getElementById("calculator-table-save");
    this._resetButton = this._shadow.getElementById("calculator-table-reset");
  }

  connectedCallback() {
    this._initInputs();

    store.subscribe(
      (state) => state.selectedType,
      this._updateSelectedType.bind(this)
    );

    store.subscribe((state) => state.Policy, this._setData.bind(this));

    this._saveButton.addEventListener("click", this._saveForm.bind(this));
  }

  /**
   * @param {string} val
   */
  set id(val) {
    if (val !== "New" && val !== "Cal") {
      this._id = +val;
    } else {
      this._id = val;
    }
    this._setData();
  }

  _setData() {
    if (this._show) {
      const Policy = store.getState().Policy;
      if (this._id !== "New" && this._id !== "Cal" && !Policy.init) return;

      if (this._id !== "New" && this._id !== "Cal" && Policy.init) {
        this.data = Policy.processedMap.get(this._id);
      } else {
        this.data = {};
      }

      this._renderData();
    }
  }

  set data(val) {
    console.log("😇 ~ setdata ~ val:", val);

    if (val) {
      // this._noData.setAttribute("hidden", "");
      // this._saveCancel.style.display = "";
      this._data = val;
      // New policy
      if (Object.keys(val).length === 0) {
      }
      // Has policy data
      else {
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
      }
    }
    // policy id is invalid or no policy data
    else {
      // this._noData.removeAttribute("hidden");
      // this._saveCancel.style.display = "none";
      // this._noDataId.innerText = this._id;
    }
  }

  async _renderData() {
    this._tableHead.innerHTML = "";
    this._tableBody.innerHTML = "";

    const {
      Policy: { processedData },
    } = store.getState();

    // Fetch Policy
    const targets = await this._getCalculatorTargets();
    const entities = this._getCalculatorEntities();
    const calculatorPolicies = await store
      .getState()
      .getCalculatorPolicies(targets);
    const policies = [...processedData, ...calculatorPolicies];

    this._getTableBodyData(entities, targets, policies);

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

    const tdActions = document.createElement("td");
    const div = document.createElement("div");
    div.classList.add("d-flex", "flex-row", "flex-justify-center");
    div.style.gap = "5px";
    tdActions.appendChild(div);
    const back = document.createElement("change-back-button");
    back.setAttribute("data-id", `${targetName}--${entityName}`);
    back.addEventListener("click", this._changeRowBack.bind(this));
    div.appendChild(back);

    const { permission } = this._tableBodyData.get(targetName).get(entityName);
    if (permission) {
      permission.split("").forEach((char, index) => {
        const td = document.createElement("td");
        if (char === "0") {
          const xmark = document.createElement("no-permission-button");
          xmark.setAttribute("data-id", `${id}--${index}`);
          xmark.addEventListener("click", this._changeRowCell.bind(this));
          td.appendChild(xmark);
        } else if (char === "1") {
          const check = document.createElement("has-permission-button");
          check.setAttribute("data-id", `${id}--${index}`);
          check.addEventListener("click", this._changeRowCell.bind(this));
          td.appendChild(check);
        }
        tr.appendChild(td);
      });

      const remove = document.createElement("remove-permission-button");
      remove.setAttribute("data-id", `${targetName}--${entityName}`);
      remove.addEventListener("click", this._removeRow.bind(this));
      div.appendChild(remove);

      tr.appendChild(tdActions);
    } else {
      "12345678".split("").forEach((char) => {
        const td = document.createElement("td");
        tr.appendChild(td);
      });

      const grant = document.createElement("grant-all-button");
      grant.setAttribute("data-id", `${targetName}--${entityName}`);
      grant.addEventListener("click", this._grantRow.bind(this));
      div.appendChild(grant);

      tr.appendChild(tdActions);
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

    const permissionStrings = Array.from(
      this._tableBodyData.get(targetName).values()
    ).map((obj) => obj.permission);
    const ordPermission = this._bitwiseOrBinaryStrings(permissionStrings);
    this._ordRowPermissionStrings.set(targetName, ordPermission);

    if (ordPermission) {
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
        }
        tr.appendChild(td);
      });
    } else {
      "12345678".split("").forEach((char) => {
        const td = document.createElement("td");
        tr.appendChild(td);
      });
    }

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

    const finalPermission = this._bitwiseOrBinaryStrings(
      Array.from(this._ordRowPermissionStrings.values())
    );

    if (finalPermission) {
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
        }
        tr.appendChild(td);
      });
    } else {
      "12345678".split("").forEach((char) => {
        const td = document.createElement("td");
        tr.appendChild(td);
      });
    }

    const tdActions = document.createElement("td");
    tr.appendChild(tdActions);

    const trOld = this._shadow.getElementById(id);
    this._tableBody.replaceChild(tr, trOld);
  }

  _renderTableHead() {
    const tr = document.createElement("tr");
    COLUMN.map((val) => {
      const th = document.createElement("th");
      th.innerText = val;
      return th;
    }).forEach((th) => {
      tr.appendChild(th);
    });
    this._tableHead.appendChild(tr);
  }

  _getTableBodyData(entities, targets, policies) {
    this._tableBodyData = new Map();

    targets.forEach((target) => {
      const targetName = `${POLICY_TARGET_NAME[target[0]]} ${target[1]}`;
      this._tableBodyData.set(targetName, new Map());

      entities.forEach((entity) => {
        const entityName = `${POLICY_ENTITY_NAME[entity[0]]} ${entity[1]}`;

        let binaryShiftedPermission = "";
        let policyId = null;
        const policy = policies.find(
          (policy) =>
            policy.entityName === entityName && policy.targetName === targetName
        );
        if (policy) {
          policyId = policy.id;
          const permission = BigInt(policy.permission);
          const shiftedPermission = permission >> BigInt(target[2]);
          binaryShiftedPermission = this._getRightmost8Bits(
            shiftedPermission.toString(2)
          );
        }
        const obj = {
          policyId,
          permission: binaryShiftedPermission,
          originalPermission: binaryShiftedPermission,
        };

        this._tableBodyData.get(targetName).set(entityName, obj);
      });
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

    const { user, groupList, organizationList } = store.getState();

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
      groupList.forEach((gr) => {
        entities.push(["group", gr.id]);
      });
      entities.push(["user", user.id]);
    }

    return entities;
  }

  async _getCalculatorTargets() {
    const targetType = this._targetTypeInput.getValue();
    const targetId = this._targetIdInput.getValue();
    const targets = [];

    if (targetType === "section") {
      const section = await fetchCredentials(
        `/rest/Section/${targetId}`,
        {},
        true
      ).then((response) => response.json());

      targets.push(["project", section.project, 8]);
      targets.push(["section", section.id, 0]);
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
}

customElements.define(
  "permission-settings-policy-calculator-view",
  PermissionSettingsPolicyCalculatorView
);
