import { TatorPage } from "../components/tator-page.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { Utilities } from "../util/utilities.js";

export class AccountProfile extends TatorPage {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "main__header d-flex flex-items-center flex-justify-center py-6"
    );
    main.appendChild(div);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    div.appendChild(h1);

    const h1Text = document.createTextNode("Account Information");
    h1.appendChild(h1Text);

    const form = document.createElement("form");
    form.setAttribute("class", "new-project__form rounded-2 py-6 px-6");
    main.appendChild(form);

    const userName = document.createElement("text-input");
    userName.setAttribute("name", "Username");
    userName.setAttribute("type", "string");
    userName.permission = false;
    form.appendChild(userName);

    this.firstName = document.createElement("text-input");
    this.firstName.setAttribute("name", "First Name");
    this.firstName.setAttribute("type", "string");
    form.appendChild(this.firstName);

    this.lastName = document.createElement("text-input");
    this.lastName.setAttribute("name", "Last Name");
    this.lastName.setAttribute("type", "string");
    form.appendChild(this.lastName);

    this.email = document.createElement("text-input");
    this.email.setAttribute("name", "Email Address");
    this.email.setAttribute("type", "string");
    form.appendChild(this.email);

    const footer = document.createElement("div");
    footer.setAttribute("class", "modal__footer d-flex py-3");
    form.appendChild(footer);

    const submit = document.createElement("input");
    submit.setAttribute("class", "btn btn-clear");
    submit.setAttribute("type", "submit");
    submit.setAttribute("disabled", "");
    submit.setAttribute("value", "Update");
    footer.appendChild(submit);

    this.firstName.addEventListener("input", (evt) => {
      const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
      if (re.test(evt.target.value)) {
        submit.removeAttribute("disabled");
      } else {
        submit.setAttribute("disabled", "");
      }
    });

    this.lastName.addEventListener("input", (evt) => {
      const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
      if (re.test(evt.target.value)) {
        submit.removeAttribute("disabled");
      } else {
        submit.setAttribute("disabled", "");
      }
    });

    this.email.addEventListener("input", (evt) => {
      const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
      if (re.test(evt.target.value)) {
        submit.removeAttribute("disabled");
      } else {
        submit.setAttribute("disabled", "");
      }
    });

    this._modalNotify = document.createElement("modal-notify");
    div.appendChild(this._modalNotify);
    this._modalNotify.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
      window.location.replace("/account-profile");
    });

    window.addEventListener("load", () => {
      fetchCredentials("/rest/User/GetCurrent")
        .then((response) => {
          return response.json();
        })
        .then((result) => {
          this.userId = result.id;
          userName.setValue(result.username);
          this.firstName.setValue(result.first_name);
          this.lastName.setValue(result.last_name);
          this.email.setValue(result.email);
        });
    });

    form.addEventListener("submit", this._updateUserProfile.bind(this));
  }

  async _updateUserProfile(evt) {
    evt.preventDefault();

    const url = "/rest/User/" + this.userId;
    const response = await fetchCredentials(url, {
      method: "PATCH",
      body: JSON.stringify({
        first_name: this.firstName.getValue(),
        last_name: this.lastName.getValue(),
        email: this.email.getValue(),
      }),
    });
    if (response.status == "200") {
      const data = await response.json();
      this._modalNotify.init(
        "Account Update",
        "Your account has been successfully updated!",
        "Ok"
      );
      this._modalNotify.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    } else {
      // Utilities.warningAlert("Account profile did not update", "#ff3e1d", false);
      const data = await response.json();
      //init(title, message, error_or_ok, buttonText, is_html)
      this._modalNotify.init("Account Not Updated", `${data.message}`, "error");
      this._modalNotify.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    }
  }
}

customElements.define("account-profile", AccountProfile);
