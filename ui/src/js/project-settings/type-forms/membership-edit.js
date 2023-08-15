import { TypeFormTemplate } from "../components/type-form-template.js";
import { getCompiledList, store } from "../store.js";

export class MembershipEdit extends TypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Membership";
    this.readableTypeName = "Membership";

    // TODO
    this._hideAttributes = true;

    //
    var templateInner = document.getElementById("membership-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("membership-edit--form");
    this._userInput = this._shadow.getElementById(
      "membership-edit--search-users"
    );
    this._permissionSelect = this._shadow.getElementById(
      "membership-edit--permission"
    );
    this._versionSelect = this._shadow.getElementById(
      "membership-edit--default-version"
    );

    this._userData = document.createElement("user-data");

    // Set enum options once
    this._permissionSelect.choices = [
      { label: "View Only", value: "View Only", selected: true },
      { label: "Can Edit", value: "Can Edit" },
      { label: "Can Transfer", value: "Can Transfer" },
      { label: "Can Execute", value: "Can Execute" },
      { label: "Full Control", value: "Full Control" },
    ];

    store.subscribe(
      (state) => state.Version,
      this.setVersionChoices.bind(this)
    );
  }

  async _setupFormUnique() {
    this._userInput.reset();
    this._userInput.init(this._userData);

    if (store.getState().Version.init === false) {
      await store.getState().initType("Version");
    }

    
    if (this._data.id == "New") {
      this._userInput.hidden = false;
    } else {
      this._userInput.hidden = true;
    }

    //
    if (this._data.id === "New") {
      //get query params
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      let username = urlParams.get("un");

      // if the exist, take value and populate
      if (username) {
        username = decodeURI(username);
        this._userInput._input.value = `${username};`;
        this._userInput._input.dispatchEvent(
          new KeyboardEvent("input", {
            key: "e",
            keyCode: 9, // example values.
            code: "Tab", // put everything you need in this object.
            which: 9,
          })
        );
      }
    }

    // permission
    this._permissionSelect._select.required = true;
    this._permissionSelect.setValue(this._data.permission);
    this._permissionSelect.default = this._data.permission;

    // default version
    this._versionSelect._select.required = true;
    this._versionSelect.setValue(this._data.default_version);
    this._versionSelect.default = this._data.default_version;
  }

  async setVersionChoices() {
    this._versionSelect.clear();
    const versionOptions = await getCompiledList({ type: "Version" });
    this._versionSelect.choices = versionOptions;
  }

  _getFormData() {
    let formData;
    // New we can be adding multiple memberships
    if (this._data.id == "New") {
      formData = [];
      const users = this._userData.getUsers();
      for (const [userId, user] of users.entries()) {
        formData.push({
          user: userId,
          permission: this._permissionSelect.getValue(),
          default_version: Number(this._versionSelect.getValue()),
        });
      }
    } else {
      // Otherwise we are just editing one
      formData = {};

      if (this._permissionSelect.changed()) {
        formData.permission = this._permissionSelect.getValue();
      }

      if (this._versionSelect.changed()) {
        formData.default_version = Number(this._versionSelect.getValue());
      }
    }

    return formData;
  }

  _getEmptyData() {
    return {
      id: `New`,
      user: "",
      permission: "View Only",
      default_version: null,
      project: this.projectId,
      form: "empty",
    };
  }
}

customElements.define("membership-edit", MembershipEdit);
