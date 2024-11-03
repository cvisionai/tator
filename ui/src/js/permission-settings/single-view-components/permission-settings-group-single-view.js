import { TatorElement } from "../../components/tator-element.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { store } from "../store.js";

export class PermissionSettingsGroupSingleView extends TatorElement {
  constructor() {
    super();

    const template = document.getElementById("group-single-view").content;
    this._shadow.appendChild(template.cloneNode(true));

    this._title = this._shadow.getElementById("title");

    this._noData = this._shadow.getElementById("no-data");
    this._form = this._shadow.getElementById("group-form");
    this._formInputForGroup = this._shadow.getElementById(
      "form-input-for-group"
    );

    this._orgIdInput = this._shadow.getElementById("organization-id-input");
    this._groupNameInput = this._shadow.getElementById("group-name");

    this._itemCount = this._shadow.getElementById("item-count");
    this._cardListDiv = this._shadow.getElementById("card-list");
    this._groupInputWarning = this._shadow.getElementById(
      "group-input-warning"
    );

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

    this.modal = document.createElement("modal-dialog");
    this._shadow.appendChild(this.modal);
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

    store.subscribe(
      (state) => state.status,
      this.handleStatusChange.bind(this)
    );
  }

  /**
   * @param {string} val
   */
  set id(val) {
    this._id = val;

    // New group
    if (val === "New") {
      this._title.innerText = "New Group";
      this._orgIdInput.removeAttribute("hidden");
      this._groupNameInput.removeAttribute("hidden");
      this._formInputForGroup.style.display = "";
      this._usernameDelete.style.display = "none";
    }
    // Edit group
    else if (!val.includes("user")) {
      this.showDimmer();
      this.loading.showSpinner();

      this._title.innerText = "Edit Group";
      this._orgIdInput.setAttribute("hidden", "");
      this._groupNameInput.removeAttribute("hidden");
      this._formInputForGroup.style.display = "";
      this._usernameDelete.style.display = "";
    }
    // Edit user's groups
    else if (val.includes("user")) {
      this.showDimmer();
      this.loading.showSpinner();

      this._title.innerText = "Edit Groups of User";
      this._orgIdInput.setAttribute("hidden", "");
      this._groupNameInput.setAttribute("hidden", "");
      this._formInputForGroup.style.display = "none";
    }

    this._cardListDiv.innerHTML = "";
    this._setData();
  }

  _setData() {
    if (!this._show) return;

    // New group
    if (this._id === "New") {
      const { organizationList } = store.getState();
      const orgIdInputChoices = organizationList.map((org, index) => {
        const choice = {
          label: `ID: ${org.id} - ${org.name}`,
          value: org.id,
        };
        if (index === 0) {
          choice.selected = true;
        }
        return choice;
      });
      this._orgIdInput.choices = orgIdInputChoices;
      this._initByData("group", {});
    }
    // Edit group
    else if (!this._id.includes("user")) {
      const { Group } = store.getState();
      if (!Group.init) {
        return;
      } else {
        this._initByData("group", Group.map.get(+this._id));
      }
    }
    // Edit user's groups
    else if (this._id.includes("user")) {
      const { Group } = store.getState();
      if (!Group.init) {
        return;
      } else {
        const userId = +this._id.replace("user", "");
        const groupIds = Group.userIdGroupIdMap.get(userId);
        this._initByData("user", { id: userId, groups: groupIds });
      }
    }
  }

  /**
   * @param {string} type -- define the page is for user's groups or group's users
   * @param {object} val
   */
  _initByData(type, val) {
    if (type === "group") {
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
          this._itemCount.innerText = "0 Members";
        }
        // Has group data (members count can be zero)
        else {
          this._groupNameInput.setValue(val.name);
          this._itemCount.innerText = `${val.members.length} Member${
            val.members.length === 1 ? "" : "s"
          }`;
        }

        this._userToBeAdded = new Map();
        this._userToBeDeleted = new Map();
        this._renderMemberCards();
      }
      // group id is invalid or no group data
      else {
        this._noData.removeAttribute("hidden");
        this._form.setAttribute("hidden", "");
        this._saveCancel.style.display = "none";
        this._noData.innerText = `There is no member data for Group ${this._id}.`;

        if (this.hasAttribute("has-open-modal")) {
          this.hideDimmer();
          this.loading.hideSpinner();
        }
      }
    } else if (type === "user") {
      if (val.id) {
        this._initAddGroupInput();

        this._noData.setAttribute("hidden", "");
        this._form.removeAttribute("hidden");
        this._saveCancel.style.display = "";
        this._data = val;

        if (val.groups) {
          this._itemCount.innerText = `${val.groups.length} Group${
            val.groups.length === 1 ? "" : "s"
          }`;
        } else {
          this._data.groups = [];
          this._itemCount.innerText = `0 Groups`;
        }

        this._groupToBeAdded = new Map();
        this._groupToBeDeleted = new Map();
        this._renderGroupCards();
      }
      // user id is invalid or no user data
      else {
        this._noData.removeAttribute("hidden");
        this._form.setAttribute("hidden", "");
        this._saveCancel.style.display = "none";
        this._noData.innerText = `There is no group data for User ${this._id.replace(
          "user",
          ""
        )}.`;

        if (this.hasAttribute("has-open-modal")) {
          this.hideDimmer();
          this.loading.hideSpinner();
        }
      }
    }
  }

  _renderGroupCards() {
    const cards = [];

    const { map } = store.getState().Group;

    if (this._data.groups && this._data.groups.length) {
      for (const groupId of this._data.groups) {
        const groupData = map.get(groupId);
        if (groupData) {
          const card = document.createElement("user-group-card");
          card.setAttribute("id", groupData.id);
          card.setAttribute("name", groupData.name);
          if (this._groupToBeDeleted.has(groupId)) {
            card.setAttribute("type", "to-be-deleted");
          }
          card.addEventListener("remove", () => {
            this._processToBeDeletedGroup(groupId, groupData);
          });
          cards.push(card);
        }
      }
    }
    for (let [groupId, groupData] of this._groupToBeAdded) {
      if (
        this._data?.groups &&
        this._data?.groups?.length &&
        this._data.groups.includes(groupId)
      ) {
        continue;
      }
      const card = document.createElement("user-group-card");
      card.setAttribute("id", groupData.id);
      card.setAttribute("name", groupData.name);
      card.setAttribute("type", "to-be-added");
      card.addEventListener("remove", () => {
        this._processToBeDeletedGroup(groupId, groupData);
      });
      cards.push(card);
    }
    // Input card
    cards.push(this._addGroupInput);

    this._cardListDiv.replaceChildren(...cards);

    if (this.hasAttribute("has-open-modal")) {
      this.hideDimmer();
      this.loading.hideSpinner();
    }
  }

  async _renderMemberCards() {
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

    this._cardListDiv.replaceChildren(...cards);

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
    console.log("😇 ~ _addMembers ~ evt:", evt);

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
      this._renderMemberCards();
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
      const el = this._cardListDiv.querySelector(
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

    this._renderMemberCards();
  }

  async _saveForm(evt) {
    evt.preventDefault();

    // New group
    if (this._id === "New") {
      const newGroupName = this._groupNameInput.getValue();
      const orgId = this._orgIdInput.getValue();
      if (!orgId) {
        this.modal._error(
          "Please specify an organization that the new group is in."
        );
        return;
      }
      if (!newGroupName) {
        this.modal._error("Please specify a group name.");
        return;
      }
      if (!this._userToBeAdded.size) {
        this.modal._error("There is no member added.");
        return;
      }

      const info = await store.getState().createGroup(orgId, {
        name: newGroupName,
        initial_members: Array.from(this._userToBeAdded.keys()),
      });

      this.handleResponse(info);
    }
    // Edit group
    else if (!this._id.includes("user")) {
      const newGroupName = this._groupNameInput.getValue();
      if (
        newGroupName === this._data.name &&
        !this._userToBeAdded.size &&
        !this._userToBeDeleted.size
      ) {
        this.modal._success("Nothing new to save!");
        return;
      }

      const info = await store.getState().updateGroup(this._data.id, {
        name: newGroupName,
        add_members: Array.from(this._userToBeAdded.keys()),
        remove_members: Array.from(this._userToBeDeleted.keys()),
      });

      this.handleResponse(info);
    }
    // Edit user's groups
    else if (this._id.includes("user")) {
      if (!this._groupToBeAdded.size && !this._groupToBeDeleted.size) {
        this.modal._success("Nothing new to save!");
        return;
      }

      const responses = [];
      for (const [groupId, group] of this._groupToBeAdded) {
        const info = await store.getState().updateGroup(groupId, {
          add_members: [this._data.id],
        });
        responses.push(info);
      }
      for (const [groupId, group] of this._groupToBeDeleted) {
        const info = await store.getState().updateGroup(groupId, {
          remove_members: [this._data.id],
        });
        responses.push(info);
      }

      this.handleResponseList(responses);
    }
  }

  handleResponse(info) {
    let message = info.data?.message ? info.data.message : "";
    if (info.response?.ok) {
      store.getState().setGroupData();
      return this.modal._success(message);
    } else {
      if (info.response?.status && info.response?.statusText) {
        return this.modal._error(
          `<strong>${info.response.status} ${info.response.statusText}</strong><br/><br/>${message}`
        );
      } else {
        return this.modal._error(`Error: Could not process request.`);
      }
    }
  }

  handleResponseList(responses) {
    if (responses && Array.isArray(responses)) {
      let sCount = 0;
      let eCount = 0;
      let errors = "";

      for (let object of responses) {
        if (object.response?.ok) {
          sCount++;
        } else {
          eCount++;
          const message = object?.data?.message || "";
          errors += `<br/><br/>${message}`;
        }
      }

      if (sCount > 0 && eCount === 0) {
        this.modal._success(
          `Successfully updated association with ${sCount} group${
            sCount == 1 ? "" : "s"
          }.`
        );
        store.getState().setGroupData();
      } else if (sCount > 0 && eCount > 0) {
        this.modal._complete(
          `Successfully updated association with ${sCount} group${
            sCount == 1 ? "" : "s"
          }.<br/><br/>
          Error updating association with ${eCount} group${
            eCount == 1 ? "" : "s"
          }.<br/><br/>
          Error message${eCount == 1 ? "" : "s"}:<br/><br/>${errors}`
        );
        store.getState().setGroupData();
      } else {
        return this.modal._error(
          `Error deleting ${eCount} group${eCount == 1 ? "" : "s"}.<br/><br/>
          Error message${eCount == 1 ? "" : "s"}:<br/><br/>${errors}`
        );
      }
    }
  }

  handleStatusChange(status) {
    if (status.name == "pending") {
      this.showDimmer();
      this.loading.showSpinner();
    } else {
      if (this.hasAttribute("has-open-modal")) {
        this.hideDimmer();
        this.loading.hideSpinner();
      }
    }
  }

  _usernameInputShowWarning(str) {
    this._usernameInputWarning.innerText = str;
    this._usernameInputWarning.classList.remove("hidden");
    setTimeout(() => {
      this._usernameInputWarning.classList.add("hidden");
    }, 4000);
  }

  _groupInputShowWarning(str) {
    this._groupInputWarning.innerText = str;
    this._groupInputWarning.classList.remove("hidden");
    setTimeout(() => {
      this._groupInputWarning.classList.add("hidden");
    }, 4000);
  }

  _initAddGroupInput() {
    this._addGroupInput = document.createElement("input");
    this._addGroupInput.setAttribute("class", "form-control");
    this._addGroupInput.setAttribute("type", "number");
    this._addGroupInput.style.height = "100%";
    this._addGroupInput.setAttribute("placeholder", "Hit Enter to add an ID");
    this._addGroupInput.value = null;

    this._addGroupInput.addEventListener("keydown", this._addGroup.bind(this));
  }

  _addGroup(evt) {
    if (evt.key === "Enter") {
      evt.preventDefault();
      const id = +this._addGroupInput.value;
      const { map } = store.getState().Group;
      const group = map.get(id);
      if (!group) {
        this._groupInputShowWarning(`Can't find group by ID ${id}.`);
      } else {
        this._processToBeAddedGroup(id, group);
        this._addGroupInput.value = null;
        this._addGroupInput.focus();
      }
    }
  }

  _processToBeAddedGroup(groupId, group) {
    if (this._groupToBeDeleted.has(groupId)) {
      this._groupToBeDeleted.delete(groupId);
    }
    // If not an original group, then add to _groupToBeAdded
    if (!this._data.groups.includes(groupId)) {
      this._groupToBeAdded.set(groupId, group);
    }

    this._renderGroupCards();
  }

  _processToBeDeletedGroup(groupId, group) {
    if (this._groupToBeAdded.has(groupId)) {
      this._groupToBeAdded.delete(groupId);
    }
    // If is an original group, then add to _groupToBeDeleted
    if (this._data.groups.includes(groupId)) {
      this._groupToBeDeleted.set(groupId, group);
    }

    this._renderGroupCards();
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
