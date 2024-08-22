import { TatorElement } from "../components/tator-element.js";
import { getCookie } from "../../../../scripts/packages/tator-js/src/utils/get-cookie.js";

export class RegistrationPage extends TatorElement {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "main__header d-flex flex-column flex-items-center flex-justify-center py-6"
    );
    main.appendChild(div);

    const img = document.createElement("img");
    img.setAttribute("class", "py-4");
    img.setAttribute("src", "/static/images/tator-logo.png");
    img.setAttribute("width", "400");
    div.appendChild(img);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    div.appendChild(h1);

    const h1Text = document.createTextNode("Register for Tator");
    h1.appendChild(h1Text);

    const form = document.createElement("form");
    form.setAttribute("class", "new-project__form rounded-2 py-3 px-6");
    form.setAttribute("style", "width:500px");
    main.appendChild(form);

    this._firstName = document.createElement("text-input");
    this._firstName.setAttribute("name", "First name");
    this._firstName.setAttribute("type", "string");
    form.appendChild(this._firstName);

    this._lastName = document.createElement("text-input");
    this._lastName.setAttribute("name", "Last name");
    this._lastName.setAttribute("type", "string");
    form.appendChild(this._lastName);

    this._email = document.createElement("text-input");
    this._email.setAttribute("name", "Email address");
    this._email.setAttribute("type", "email");
    form.appendChild(this._email);

    this._username = document.createElement("text-input");
    this._username.setAttribute("name", "Username");
    this._username.setAttribute("type", "string");
    form.appendChild(this._username);

    this._password = document.createElement("text-input");
    this._password.setAttribute("name", "Password");
    this._password.setAttribute("type", "password");
    form.appendChild(this._password);

    this._passwordConfirm = document.createElement("text-input");
    this._passwordConfirm.setAttribute("name", "Password (confirm)");
    this._passwordConfirm.setAttribute("type", "password");
    form.appendChild(this._passwordConfirm);

    const footer = document.createElement("div");
    footer.setAttribute("class", "modal__footer d-flex py-3");
    form.appendChild(footer);

    this._submit = document.createElement("input");
    this._submit.setAttribute("class", "btn btn-clear");
    this._submit.setAttribute("type", "submit");
    this._submit.setAttribute("disabled", "");
    this._submit.setAttribute("value", "Register");
    footer.appendChild(this._submit);

    const errors = document.createElement("div");
    errors.setAttribute(
      "class",
      "main__header d-flex flex-column flex-items-center flex-justify-center py-6"
    );
    main.appendChild(errors);

    this._errorList = document.createElement("ul");
    this._errorList.setAttribute("class", "form-errors");
    errors.appendChild(this._errorList);

    this._dimmer = document.createElement("div");
    this._dimmer.setAttribute("class", "background-dimmer");
    this._shadow.appendChild(this._dimmer);

    // Whether the form is valid or not
    this._valid = false;

    this._username.addEventListener("input", (evt) => this._validateForm(evt));
    this._password.addEventListener("change", (evt) => this._validateForm(evt));
    this._passwordConfirm.addEventListener("input", (evt) =>
      this._validateForm(evt)
    );
    this._firstName.addEventListener("input", (evt) => this._validateForm(evt));
    this._lastName.addEventListener("input", (evt) => this._validateForm(evt));
    this._email.addEventListener("input", (evt) => this._validateForm(evt));

    this._modalNotify = document.createElement("modal-notify");
    div.appendChild(this._modalNotify);
    this._modalNotify.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    form.addEventListener("submit", (evt) => {
      evt.preventDefault();
      const body = {
        first_name: this._firstName.getValue(),
        last_name: this._lastName.getValue(),
        email: this._email.getValue(),
        username: this._username.getValue(),
        password: this._password.getValue(),
      };
      const params = new URLSearchParams(window.location.search);
      if (params.has("registration_token")) {
        body.registration_token = params.get("registration_token");
      }
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (!KEYCLOAK_ENABLED) {
        headers["X-CSRFToken"] = getCookie("csrftoken");
      }
      fetch("/rest/Users", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      })
        .then((response) => {
          if (response.status == 400) {
            return response.json();
          } else {
            return Promise.resolve("success");
          }
        })
        .then((data) => {
          if (data == "success") {
            this._modalNotify.init(
              "Registration succeeded!",
              "Press Continue to go to login screen.",
              "ok",
              "Continue"
            );
            this._modalNotify.addEventListener("close", (evt) => {
              window.location.replace("/accounts/login");
            });
          } else {
            this._modalNotify.init(
              "Registration failed!",
              data.message,
              "error",
              "Close"
            );
          }
          this._modalNotify.setAttribute("is-open", "");
          this.setAttribute("has-open-modal", "");
        });
    });
  }

  static get observedAttributes() {
    return ["has-open-modal"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "has-open-modal":
        if (newValue === null) {
          this._dimmer.classList.remove("has-open-modal");
        } else {
          this._dimmer.classList.add("has-open-modal");
        }
        break;
    }
  }

  _addError(msg) {
    const li = document.createElement("li");
    this._errorList.appendChild(li);

    const h3 = document.createElement("h3");
    h3.setAttribute("class", "h3 text-red");
    h3.setAttribute("style", "text-align:center;width:400px");
    h3.textContent = msg;
    li.appendChild(h3);
  }

  _validateUsername() {
    // Check username
    const username = this._username.getValue();
    if (username.length > 150) {
      this._addError("Username must be less than 150 characters long.");
      this._valid = false;
    }
    if (username.length == 0) {
      this._valid = false;
    } else {
      return fetch(
        `/rest/User/Exists?username=${encodeURIComponent(username)}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      )
        .then((response) => response.json())
        .then((exists) => {
          if (exists) {
            this._addError("Username already taken!");
            this._valid = false;
          }
        });
    }
    return Promise.resolve(this._valid);
  }

  _validatePassword() {
    const password = this._password.getValue();
    if (password.length == 0) {
      this._valid = false;
    } else if (password.length < 8) {
      this._addError("Password must be at least 8 characters long.");
      this._valid = false;
    }
  }

  _validatePasswordConfirm() {
    const password = this._password.getValue();
    const passwordConfirm = this._passwordConfirm.getValue();
    if (passwordConfirm.length == 0) {
      this._valid = false;
    } else if (password != passwordConfirm) {
      this._addError("Passwords do not match.");
      this._valid = false;
    }
  }

  _validateFirstName() {
    const firstName = this._firstName.getValue();
    const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
    if (firstName.length == 0) {
      this._valid = false;
    } else if (!re.test(firstName)) {
      this._addError("First name contains invalid characters.");
      this._valid = false;
    }
  }

  _validateLastName() {
    const lastName = this._lastName.getValue();
    const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
    if (lastName.length == 0) {
      this._valid = false;
    } else if (!re.test(lastName)) {
      this._addError("Last name contains invalid characters.");
      this._valid = false;
    }
  }

  _validateEmail() {
    const email = this._email.getValue();
    if (email.length == 0) {
      this._valid = false;
    } else {
      return fetch(`/rest/User/Exists?email=${email}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
        .then((response) => response.json())
        .then((exists) => {
          if (exists) {
            this._addError("Email already in use!");
            this._valid = false;
          }
        });
    }
    return Promise.resolve(this._valid);
  }

  _validateForm(evt) {
    this._valid = true;

    // Clear errors
    while (this._errorList.firstChild) {
      this._errorList.removeChild(this._errorList.firstChild);
    }

    // Check each field
    this._validateUsername()
      .then(this._validateEmail())
      .then(() => {
        this._validatePassword();
        this._validatePasswordConfirm();
        this._validateFirstName();
        this._validateLastName();

        // Enable/disable registration button
        if (this._valid) {
          this._submit.removeAttribute("disabled");
        } else {
          this._submit.setAttribute("disabled", "");
        }
      });
  }
}

customElements.define("registration-page", RegistrationPage);
