class UserInput extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1");
    this._shadow.appendChild(label);

    this._name = document.createTextNode("");
    label.appendChild(this._name);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-column col-12");
    label.appendChild(div);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "form-control input-sm col-12");
    this._input.setAttribute("type", "text");
    this._input.setAttribute("placeholder", "Enter semicolon delimited usernames or email addresses...");
    div.appendChild(this._input);

    this._pills = document.createElement("div");
    this._pills.setAttribute("class", "py-3 d-flex flex-column");
    div.appendChild(this._pills);

    this._input.addEventListener("input", () => {
      const value = this._input.value;
      if (value.indexOf(";") > -1) {
        const usernames = value.split(";");
        usernames.pop();
        this._data.findUsers(usernames);
        this._input.value = "";
      }
    });
  }

  static get observedAttributes() {
    return ["name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._name.nodeValue = newValue;
        break;
    }
  }

  set permission(val) {
    if (hasPermission(val, "Can Edit")) {
      this._input.removeAttribute("readonly");
      this._input.classList.remove("disabled");
    } else {
      this._input.setAttribute("readonly", "");
      this._input.classList.add("disabled");
    }
  }

  init(data) {
    // Initialize with a UserData object.
    this._data = data;
    this._data.addEventListener("users", evt => {
      const users = evt.detail.users;
      const pillIds = [];
      // Remove pills that are no longer in the list.
      for (const pill of this._pills.children) {
        if (!users.has(pill.getId())) {
          this._pills.removeChild(pill);
        } else {
          pillIds.push(pill.getId());
        }
      }
      // Create pills for any IDs that don't exist.
      for (const [userId, user] of users.entries()) {
        if (!pillIds.includes(userId)) {
          const name = user.first_name ? `${user.first_name} ${user.last_name}` : user.username;
          this._addPill(name, user.id);
        }
      }
    });
  }

  reset() {
    // Go back to default value
    this._input.setValue("");
  }

  _addPill(name, userId) {
    const pill = document.createElement("removable-pill");
    pill.setAttribute("class", "py-1");
    pill.init(name, userId);
    this._pills.appendChild(pill);
    pill.addEventListener("removeId", evt => {
      this._data.removeUser(evt.detail.id);
    });
  }
}

customElements.define("user-input", UserInput);
