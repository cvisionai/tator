import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class PermissionSettingsGroupSingleView extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("group-single-view").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._titleType = this._shadow.getElementById("title-type");

    this._groupNameInput = this._shadow.getElementById("group-name");
    this._groupMemberListDiv = this._shadow.getElementById("group-member-list");

    this._newGroupActions = this._shadow.getElementById("new-group-actions");
    this._newGroupUsernameList = this._shadow.getElementById(
      "new-group--username-list-input"
    );
    this._newGroupUsernameList._input.setAttribute(
      "placeholder",
      "Ensure that each username is on a separate line."
    );

    this._editGroupActions = this._shadow.getElementById("edit-group-actions");
  }

  connectedCallback() {
    store.subscribe(
      (state) => state.selectedType,
      this._updateSelectedType.bind(this)
    );

    store.subscribe((state) => state.Group, this._setData.bind(this));
  }

  /**
   * @param {string} val
   */
  set id(val) {
    this._id = +val;
    if (val === "New") {
      this._titleType.innerText = "New";
      this._newGroupActions.classList.remove("hidden");
      this._editGroupActions.classList.add("hidden");
    } else {
      this._titleType.innerText = "Edit";
      this._newGroupActions.classList.add("hidden");
      this._editGroupActions.classList.remove("hidden");
      this._setData();
    }
  }

  set data(val) {
    this._data = val;
  }

  _setData() {
    if (this._show) {
      const Group = store.getState().Group;
      if (Group.init) {
        this.data = Group.map.get(this._id);
        this._renderData();
      } else {
        console.log("Group data not ready");
      }
    }
  }

  _renderData() {
    console.log("😇", this._data);

    if (this._data?.members && this._data?.members?.length) {
      const cards = this._data.members.map((memberId) => {
        const card = document.createElement("group-member-card");
        return card;
      });
      this._groupMemberListDiv.replaceChildren(...cards);
    }
  }

  _updateSelectedType(newSelectedType, oldSelectedType) {
    if (
      newSelectedType.typeName !== "Group" ||
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
  "permission-settings-group-single-view",
  PermissionSettingsGroupSingleView
);
