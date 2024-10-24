import { TatorElement } from "../../components/tator-element.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { store } from "../store.js";

export class PermissionSettingsGroupSingleView extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("group-single-view").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._titleType = this._shadow.getElementById("title-type");

    this._noData = this._shadow.getElementById("no-data");
    this._noDataId = this._shadow.getElementById("no-data--group-id");
    this._form = this._shadow.getElementById("group-form");

    this._groupNameInput = this._shadow.getElementById("group-name");
    this._groupMemberListDiv = this._shadow.getElementById("group-member-list");

    this._memberCount = this._shadow.getElementById("group-member-count");

    this._usernameInput = this._shadow.getElementById("username-list-input");
    this._usernameInput._input.setAttribute(
      "placeholder",
      "Ensure that each username or email is on a separate line."
    );
    this._usernameInputWarning = this._shadow.getElementById(
      "username-list-warning"
    );
    this._usernameAdd = this._shadow.getElementById("username-list-add");
    this._usernameDelete = this._shadow.getElementById("username-list-delete");

    this._saveCancel = this._shadow.getElementById(
      "group-single-view--save-cancel-section"
    );

    // // loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());
  }

  connectedCallback() {
    this._initUserInput();

    this._usernameInput.addEventListener("change", () => {
      const value = this._usernameInput.getValue();
      this._usernameInputString = value;
    });

    this._usernameAdd.addEventListener("click", this._addMembers.bind(this));
    this._usernameDelete.addEventListener(
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
    if (val !== "New") {
      this._id = +val;
    } else {
      this._id = val;
    }

    if (val === "New") {
      this._titleType.innerText = "New";
      this._usernameDelete.style.display = "none";
    } else {
      this.showDimmer();
      this.loading.showSpinner();

      this._titleType.innerText = "Edit";
      this._usernameDelete.style.display = "";
    }
    this._groupMemberListDiv.innerHTML = "";
    this._setData();
  }

  _setData() {
    if (this._show) {
      const Group = store.getState().Group;
      if (this._id !== "New" && !Group.init) return;

      if (this._id !== "New" && Group.init) {
        this.data = Group.map.get(this._id);
      } else {
        this.data = {};
      }

      this._usernameInput.setValue("");
      this._userToBeAdded.reset();
      this._userToBeDeleted.reset();
      this._renderData();
    }
  }

  set data(val) {
    if (val) {
      this._noData.setAttribute("hidden", "");
      this._form.removeAttribute("hidden");
      this._saveCancel.style.display = "";
      this._data = val;
      // New group
      if (Object.keys(val).length === 0) {
        this._groupNameInput.setValue("");
        this._memberCount.innerText = "0 Members";
      }
      // Has group data
      else {
        this._groupNameInput.setValue(val.name);
        this._memberCount.innerText = `${val.members.length} Member${
          val.members.length === 1 ? "" : "s"
        }`;
      }
    }
    // group id is invalid or no group data
    else {
      this._noData.removeAttribute("hidden");
      this._form.setAttribute("hidden", "");
      this._saveCancel.style.display = "none";
      this._noDataId.innerText = this._id;
    }
  }

  async _renderData() {
    const cards = [];
    if (this._data?.members && this._data?.members?.length) {
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
    }
    for (let [userId, userData] of this._userToBeAdded.getUsers()) {
      if (
        this._data?.members &&
        this._data?.members?.length &&
        this._data.members.includes(userId)
      ) {
        continue;
      }
      const card = document.createElement("group-member-card");
      card.setAttribute("username", userData.username);
      card.setAttribute("email", userData.email);
      card.setAttribute("type", "to-be-added");
      cards.push(card);
    }

    this._groupMemberListDiv.replaceChildren(...cards);

    if (this.hasAttribute("has-open-modal")) {
      this.hideDimmer();
      this.loading.hideSpinner();
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
    const trimmedInput = this._usernameInputString.trim();
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
    const trimmedInput = this._usernameInputString.trim();
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
    this._usernameInputWarning.innerText = str;
    this._usernameInputWarning.classList.remove("hidden");
    setTimeout(() => {
      this._usernameInputWarning.classList.add("hidden");
    }, 4000);
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
  "permission-settings-group-single-view",
  PermissionSettingsGroupSingleView
);
