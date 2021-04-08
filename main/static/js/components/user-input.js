class UserInput extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1");
    this._shadow.appendChild(label);

    this._name = document.createTextNode("");
    label.appendChild(this._name);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "form-control input-sm col-12");
    this._input.setAttribute("type", "text");
    this._input.setAttribute("placeholder", "Enter semicolon delimited usernames or email addresses...");
    label.appendChild(this._input);

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
      console.log(`GOT USERS: ${evt.detail.users}`);
      console.log(`COULDN'T FIND: ${evt.detail.missing}`);
    });
  }

  reset() {
    // Go back to default value
    this._input.setValue("");
  }
}

customElements.define("user-input", UserInput);
