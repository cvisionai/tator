import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";
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
<col style="width: 14%" />
<col style="width: 14%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
<col style="width: 8%" />
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

    this._table = this._shadow.getElementById("permission-table");
    this._colgroup = this._shadow.getElementById("permission-table--colgroup");
    this._tableHead = this._shadow.getElementById("permission-table--head");
    this._tableBody = this._shadow.getElementById("permission-table--body");

    this._colgroup.innerHTML = COLGROUP;
  }

  connectedCallback() {
    this._initInputs();

    store.subscribe(
      (state) => state.selectedType,
      this._updateSelectedType.bind(this)
    );

    store.subscribe((state) => state.Policy, this._setData.bind(this));
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

    const requestedEntityName = `${this._entityTypeInput.getValue()} ${this._entityIdInput.getValue()}`;

    const {
      user,
      groupList,
      organizationList,
      Policy: { processedData },
    } = store.getState();

    // Head
    const tr = document.createElement("tr");
    COLUMN.map((val) => {
      const th = document.createElement("th");
      th.innerText = val;
      return th;
    }).forEach((th) => {
      tr.appendChild(th);
    });
    this._tableHead.appendChild(tr);

    // Fetch Policy
    const targets = await this._getCalculatorTargets();
    const calculatorPolicies = await store
      .getState()
      .getCalculatorPolicies(targets);

    const entities = this._getCalculatorEntities();
    const policies = [...processedData, ...calculatorPolicies];

    const tableBodyData = this._getTableBodyData(entities, targets, policies);

    // Body
    Object.entries(tableBodyData).forEach(([targetName, policies]) => {
      const permissionStrings = Object.values(policies);
      const entityCount = permissionStrings.length;

      Object.entries(policies).forEach(([entityName, permission], index) => {
        const tr = document.createElement("tr");

        const tdEntity = document.createElement("td");
        tdEntity.innerText = entityName;
        tr.appendChild(tdEntity);

        if (index === 0) {
          const tdTarget = document.createElement("td");
          tdTarget.innerText = targetName;
          tdTarget.setAttribute("rowspan", entityCount);
          tr.appendChild(tdTarget);
        }

        if (permission) {
          permission.split("").forEach((char) => {
            const td = document.createElement("td");
            td.innerText = char;
            tr.appendChild(td);
          });
        } else {
          "12345678".split("").forEach((char) => {
            const td = document.createElement("td");
            tr.appendChild(td);
          });
        }

        const tdActions = document.createElement("td");
        const edit = document.createElement("edit-line-button");
        edit.setAttribute("href", ``);
        tdActions.appendChild(edit);
        tr.appendChild(tdActions);

        this._tableBody.appendChild(tr);
      });

      // OR'd row
      const tr = document.createElement("tr");

      const td = document.createElement("td");
      td.innerText = `${requestedEntityName}'s effective permission against ${targetName}`;
      td.setAttribute("colspan", 2);
      tr.appendChild(td);

      const effectivePermission =
        this._bitwiseOrBinaryStrings(permissionStrings);

      if (effectivePermission) {
        effectivePermission.split("").forEach((char) => {
          const td = document.createElement("td");
          td.innerText = char;
          tr.appendChild(td);
        });
      } else {
        "12345678".split("").forEach((char) => {
          const td = document.createElement("td");
          tr.appendChild(td);
        });
      }

      const tdActions = document.createElement("td");
      const edit = document.createElement("edit-line-button");
      edit.setAttribute("href", ``);
      tdActions.appendChild(edit);
      tr.appendChild(tdActions);

      this._tableBody.appendChild(tr);
    });

    //
    //
    /*
    targets.forEach((target) => {
      entities.forEach((entity, index) => {
        const tr = document.createElement("tr");

        const tds = [];
        let binaryShiftedPermission = "";
        const policy = policyList.find(
          (policy) =>
            policy.entityId === entity[1] &&
            policy.targetId === target[1] &&
            policy.entityType === entity[0] &&
            policy.targetType === target[0]
        );
        if (policy) {
          const permission = BigInt(policy.permission);
          const shiftedPermission = permission >> BigInt(target[2]);
          binaryShiftedPermission = this._getRightmost8Bits(
            shiftedPermission.toString(2)
          );
        }

        for (let i = 0; i < COLUMN.length; i++) {
          const td = document.createElement("td");
          if (i === 0) {
            td.innerText = `${this._capitalizeString(entity[0])} ${entity[1]}`;
          } else if (i === 1) {
            if (index === 0) {
              td.innerText = `${this._capitalizeString(target[0])} ${
                target[1]
              }`;
              td.setAttribute("rowspan", entities.length);
            } else {
              continue;
            }
          } else if (i === 10) {
            const edit = document.createElement("edit-line-button");
            edit.setAttribute("href", ``);
            td.appendChild(edit);
          } else if (binaryShiftedPermission) {
            td.innerText = binaryShiftedPermission[i - 2];
          }
          tds.push(td);
        }
        tds.forEach((td) => {
          tr.appendChild(td);
        });
        this._tableBody.appendChild(tr);
      });
    });
    /*
    [...processedData].forEach((policy) => {
      const match = targets.findIndex(
        (target) =>
          policy.targetId === target[1] && policy.targetType === target[0]
      );
      if (match === -1) return;

      const tr = document.createElement("tr");
      COLUMN.map((val) => {
        const td = document.createElement("td");
        if (val === "Policy Entity") {
          td.innerText = policy.entityName;
        } else if (val === "Policy Target") {
          td.innerText = policy.targetName;
        } else if (val === "Actions") {
          const edit = document.createElement("edit-line-button");
          edit.setAttribute("href", ``);
          td.appendChild(edit);
        } else {
          td.innerText = policy.permission;
        }
        return td;
      }).forEach((td) => {
        tr.appendChild(td);
      });
      this._tableBody.appendChild(tr);
    });
    */
  }

  _getTableBodyData(entities, targets, policies) {
    const tableBodyData = {};
    targets.forEach((target) => {
      const targetName = `${this._capitalizeString(target[0])} ${target[1]}`;
      tableBodyData[targetName] = {};

      entities.forEach((entity) => {
        const entityName = `${this._capitalizeString(entity[0])} ${entity[1]}`;

        let binaryShiftedPermission = "";
        const policy = policies.find(
          (policy) =>
            policy.entityName === entityName && policy.targetName === targetName
        );
        if (policy) {
          const permission = BigInt(policy.permission);
          const shiftedPermission = permission >> BigInt(target[2]);
          binaryShiftedPermission = this._getRightmost8Bits(
            shiftedPermission.toString(2)
          );
        }

        tableBodyData[targetName][entityName] = binaryShiftedPermission;
      });
    });
    return tableBodyData;
  }

  _getCalculatorEntities() {
    const { user, groupList, organizationList } = store.getState();
    const entities = [];

    entities.push(["user", user.id]);
    groupList.forEach((gr) => {
      entities.push(["group", gr.id]);
    });
    organizationList.forEach((org) => {
      entities.push(["organization", org.id]);
    });

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

  _initInputs() {
    this._entityTypeInput.choices = ENTITY_TYPE_CHOICES;
    this._targetTypeInput.choices = TARGET_TYPE_CHOICES;
  }

  _capitalizeString(str) {
    // Split by " " or "_"
    return str
      .split(/[\s_]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
