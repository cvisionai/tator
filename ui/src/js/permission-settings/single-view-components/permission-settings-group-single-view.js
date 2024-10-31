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
    this._save = this._shadow.getElementById("group-single-view-save");

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

    this._save.addEventListener("click", this._saveForm.bind(this));

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
      } else if (this._id === "New") {
        this.data = {};
      }

      this._usernameInput.setValue("");
      this._userToBeAdded = new Map();
      this._userToBeDeleted = new Map();
      this._renderData();
    }
  }

  set data(val) {
    if (val) {
      this._noData.setAttribute("hidden", "");
      this._form.removeAttribute("hidden");
      this._saveCancel.style.display = "";
      this._data = val;
      // This _userData is just used for storing users' data, to reduce number of rest calls
      this._userData = new Map();

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
        if (!this._userData.has(memberId)) {
          const data = await store.getState().findUserById(memberId);
          this._userData.set(memberId, data);
        }
        const userData = this._userData.get(memberId);
        if (userData) {
          const card = document.createElement("group-member-card");
          card.setAttribute("username", userData.username);
          card.setAttribute("email", userData.email);
          card.setAttribute("data-id", userData.id);
          if (this._userToBeDeleted.has(memberId)) {
            card.setAttribute("type", "to-be-deleted");
          }
          cards.push(card);
        }
      }
    }
    for (let [userId, userData] of this._userToBeAdded) {
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
      card.setAttribute("data-id", userData.id);
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
    this._userToBeAdded = new Map();
    this._userToBeDeleted = new Map();
  }

  async _addMembers(evt) {
    evt.preventDefault();
    const trimmedInput = this._usernameInputString.trim();
    if (!trimmedInput) {
      return;
    }
    const inputList = trimmedInput.split("\n");
    const result = await store.getState().findUsers(inputList);
    console.log("😇 ~ _addMembers ~ result:", result);
    this._processToBeAddedUsers(result);
  }

  _processToBeAddedUsers({ found, notFound }) {
    if (notFound.length) {
      const warningStr = `Cannot find user information for these: ${notFound.join(
        ", "
      )}.`;
      this._usernameInputShowWarning(warningStr);
    }

    if (found.size) {
      for (let [userId, user] of found) {
        if (this._userToBeDeleted.has(userId)) {
          this._userToBeDeleted.delete(userId);
        }
        // If not an original member, then add to _userToBeAdded
        if (!this._data.members || !this._data.members.includes(userId)) {
          this._userToBeAdded.set(userId, user);
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

    const notFound = [];
    // Find elements directly
    inputList.forEach((input) => {
      const el = this._groupMemberListDiv.querySelector(
        `[${input.indexOf("@") > -1 ? "email" : "username"}="${input}"]`
      );
      if (el) {
        const type = el.getAttribute("type");
        const id = +el.dataset.id;
        if (type === "to-be-added") {
          this._userToBeAdded.delete(id);
        } else {
          const userData = this._userData.get(id);
          this._userToBeDeleted.set(id, userData);
        }
      } else {
        notFound.push(input);
      }
    });

    if (notFound.length) {
      const warningStr = `Cannot find user information for these: ${notFound.join(
        ", "
      )}.`;
      this._usernameInputShowWarning(warningStr);
    }

    this._renderData();
  }

  _usernameInputShowWarning(str) {
    this._usernameInputWarning.innerText = str;
    this._usernameInputWarning.classList.remove("hidden");
    setTimeout(() => {
      this._usernameInputWarning.classList.add("hidden");
    }, 4000);
  }

  async _saveForm(evt) {
    evt.preventDefault();

    const newGroupName = this._groupNameInput.getValue();
    console.log("", this._userToBeAdded);
    console.log("", this._userToBeDeleted);

    if (this._id === "New") {
      const original = this._data.members ? this._data.members : [];
      const toBeAdded = Array.from(this._userToBeAdded.keys());
      const toBeDeleted = Array.from(this._userToBeDeleted.keys());
      const members = new Set([...original, ...toBeAdded]);
      toBeDeleted.forEach((id) => members.delete(id));

      if (members.size) {
        const responseInfo = await store
          .getState()
          .createGroup(store.getState().organizationList[0].id, {
            name: newGroupName,
            initial_members: [...members],
          });

        console.log("😇 ~ _saveForm ~ responseInfo:", responseInfo);
        console.log("", store.getState().status);
      }
    } else {
      const repsonseInfo = await store.getState().updateGroup(this._data.id, {
        name: newGroupName,
        add_members: Array.from(this._userToBeAdded.keys()),
        remove_members: Array.from(this._userToBeDeleted.keys()),
      });

      if (repsonseInfo && repsonseInfo.ok) {
        store.getState().setGroupData();
      } else {
        console.log("", store.getState().status);
      }
    }
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
