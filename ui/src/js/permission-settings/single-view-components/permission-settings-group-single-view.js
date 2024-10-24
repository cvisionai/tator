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
      "Ensure that each username or email is on a separate line."
    );
    this._newGroupUsernameInput = "";

    this._editGroupActions = this._shadow.getElementById("edit-group-actions");
    this._editGroupUsernameList = this._shadow.getElementById(
      "edit-group--username-list-input"
    );
    this._editGroupUsernameList._input.setAttribute(
      "placeholder",
      "Ensure that each username or email is on a separate line."
    );
    this._editGroupAdd = this._shadow.getElementById(
      "edit-group--username-list-add"
    );
    this._editGroupDelete = this._shadow.getElementById(
      "edit-group--username-list-delete"
    );
    this._editGroupWarning = this._shadow.getElementById(
      "edit-group--username-list-warning"
    );
  }

  connectedCallback() {
    this._initUserInput();

    this._editGroupUsernameList.addEventListener("change", () => {
      const value = this._editGroupUsernameList.getValue();
      this._editGroupUsernameInput = value;
    });

    this._editGroupAdd.addEventListener("click", this._addMembers.bind(this));
    this._editGroupDelete.addEventListener(
      "click",
      this._deleteMembers.bind(this)
    );

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
        this._groupMemberListDiv.innerHTML = "";
        this.data = Group.map.get(this._id);
        this._userToBeAdded.reset();
        this._userToBeDeleted.reset();
        this._renderData();
      } else {
        console.log("Group data not ready");
      }
    }
  }

  async _renderData() {
    if (this._data?.members && this._data?.members?.length) {
      const cards = [];
      for (const memberId of this._data.members) {
        const userData = await this._userToBeAdded.getUserById(memberId);
        const card = document.createElement("group-member-card");
        card.setAttribute("username", userData.username);
        card.setAttribute("email", userData.email);
        if (this._userToBeDeleted.getUsers().has(memberId)) {
          card.setAttribute("type", "to-be-deleted");
        }
        cards.push(card);
      }
      for (let [userId, userData] of this._userToBeAdded.getUsers()) {
        if (this._data.members.includes(userId)) continue;
        const card = document.createElement("group-member-card");
        card.setAttribute("username", userData.username);
        card.setAttribute("email", userData.email);
        card.setAttribute("type", "to-be-added");
        cards.push(card);
      }

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

  _initUserInput() {
    this._userToBeAdded = document.createElement("user-data");
    this._userToBeAdded.addEventListener(
      "users",
      this._processToBeAddedUsers.bind(this)
    );

    this._userToBeDeleted = document.createElement("user-data");
    this._userToBeDeleted.addEventListener(
      "users",
      this._processToBeDeletedUsers.bind(this)
    );
  }

  _addMembers(evt) {
    evt.preventDefault();
    const trimmedInput = this._editGroupUsernameInput.trim();
    if (!trimmedInput) {
      return;
    }
    const inputList = trimmedInput.split("\n");
    this._userToBeAdded.findUsers(inputList);
  }

  _processToBeAddedUsers(evt) {
    console.log("😇 ~ _processToBeAddedUsers ~ evt.detail:", evt.detail);
    if (evt.detail.missing?.length) {
      const warningStr = `Cannot find user information for these: ${evt.detail.missing.join(
        ", "
      )}.`;
      this._editGroupShowWarning(warningStr);
    }
    if (evt.detail.users.size) {
      for (let [userId, user] of evt.detail.users) {
        if (this._userToBeDeleted.getUsers().has(userId)) {
          this._userToBeDeleted.removeUser(userId);
        }
      }
      this._renderData();
    }
  }

  _deleteMembers(evt) {
    evt.preventDefault();
    const trimmedInput = this._editGroupUsernameInput.trim();
    if (!trimmedInput) {
      return;
    }
    const inputList = trimmedInput.split("\n");
    this._userToBeDeleted.findUsers(inputList);
  }

  _processToBeDeletedUsers(evt) {
    console.log("😇 ~ _processToBeDeletedUsers ~ evt.detail:", evt.detail);
    if (evt.detail.missing?.length) {
      const warningStr = `Cannot find user information for these: ${evt.detail.missing.join(
        ", "
      )}.`;
      this._editGroupShowWarning(warningStr);
    }
    if (evt.detail.users.size) {
      for (let [userId, user] of evt.detail.users) {
        if (this._userToBeAdded.getUsers().has(userId)) {
          this._userToBeAdded.removeUser(userId);
        }
      }
      this._renderData();
    }
  }

  _editGroupShowWarning(str) {
    this._editGroupWarning.innerText = str;
    this._editGroupWarning.classList.remove("hidden");
    setTimeout(() => {
      this._editGroupWarning.classList.add("hidden");
    }, 4000);
  }
}

customElements.define(
  "permission-settings-group-single-view",
  PermissionSettingsGroupSingleView
);
