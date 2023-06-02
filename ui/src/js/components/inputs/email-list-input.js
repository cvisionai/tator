import { TatorElement } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";

export class EmailListInput extends TatorElement {
  constructor() {
    super();

    const label = document.createElement("label");
    label.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-1"
    );
    this._shadow.appendChild(label);

    this._name = document.createTextNode("");
    label.appendChild(this._name);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-column col-8");
    label.appendChild(div);

    this._input = document.createElement("input");
    this._input.setAttribute("class", "form-control input-sm col-12");
    this._input.setAttribute("type", "text");
    this._input.setAttribute(
      "placeholder",
      "Enter semicolon delimited email addresses..."
    );
    div.appendChild(this._input);

    const div1 = document.createElement("div");
    div1.setAttribute("class", "d-flex flex-row");
    this._shadow.appendChild(div1);

    const div2 = document.createElement("div");
    div2.setAttribute("class", "col-4");
    div1.appendChild(div2);

    const div3 = document.createElement("div");
    div3.setAttribute("class", "d-flex flex-column");
    div1.appendChild(div3);

    this._pills = document.createElement("div");
    this._pills.setAttribute("class", "py-3 d-flex flex-column");
    div3.appendChild(this._pills);

    this._errors = document.createElement("ul");
    div3.appendChild(this._errors);

    this._input.addEventListener("input", () => {
      // Clear error messages.
      while (this._errors.firstChild) {
        this._errors.removeChild(this._errors.firstChild);
      }
      const value = this._input.value;
      if (value.indexOf(";") > -1) {
        const emails = value.split(";");
        emails.pop();
        this._validateEmails(emails);
        this._input.value = "";
      }
    });

    this._input.addEventListener("change", () => {
      // Clear error messages.
      while (this._errors.firstChild) {
        this._errors.removeChild(this._errors.firstChild);
      }
      const value = this._input.value;
      if (value.length > 0) {
        this._validateEmails([value]);
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

  reset() {
    // Go back to default value
    this._input.setValue("");
    // Remove pills that are no longer in the list.
    for (const pill of this._pills.children) {
      this._pills.removeChild(pill);
    }
  }

  getValues() {
    const emails = [];
    for (const pill of this._pills.children) {
      emails.push(pill.getId());
    }
    return emails;
  }

  _validateEmails(emails) {
    const re =
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    for (const email of emails) {
      if (re.test(email)) {
        this._addPill(email, email);
      } else {
        this._addError(`${email} is not a valid email address!`);
      }
    }
  }

  _addPill(name, userId) {
    const pill = document.createElement("removable-pill");
    pill.setAttribute("class", "py-1 d-flex");
    pill.init(name, userId);
    this._pills.appendChild(pill);
    pill.addEventListener("removeId", (evt) => {
      const email = evt.detail.id;
      for (const pill of this._pills.children) {
        if (pill.getId() == email) {
          this._pills.removeChild(pill);
        }
      }
    });
  }

  _addError(msg) {
    const li = document.createElement("li");
    this._errors.appendChild(li);

    const h3 = document.createElement("h3");
    h3.setAttribute("class", "h3 text-red");
    h3.textContent = msg;
    li.appendChild(h3);
  }

  clear() {
    if (this._pills.length) {
      for (const pill of this._pills.children) {
        this._pills.removeChild(pill);
      }
    }
  }
}

customElements.define("email-list-input", EmailListInput);
