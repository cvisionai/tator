import { TatorPage } from "../components/tator-page.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { store } from "./store.js";

export class TokenPage extends TatorPage {
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

    const h1Text = document.createTextNode(
      "Enter credentials to get API token"
    );
    h1.appendChild(h1Text);

    const form = document.createElement("form");
    form.setAttribute("class", "new-project__form rounded-2 py-3 px-6");
    form.setAttribute("style", "width:500px");
    main.appendChild(form);

    this._username = document.createElement("text-input");
    this._username.setAttribute("name", "Username");
    this._username.setAttribute("type", "string");
    form.appendChild(this._username);

    this._password = document.createElement("text-input");
    this._password.setAttribute("name", "Password");
    this._password.setAttribute("type", "password");
    form.appendChild(this._password);

    this._refresh = document.createElement("bool-input");
    this._refresh.setAttribute("name", "Refresh");
    this._refresh.setAttribute("on-text", "Yes");
    this._refresh.setAttribute("off-text", "No");
    this._refresh.setValue(false);
    form.appendChild(this._refresh);

    const footer = document.createElement("div");
    footer.setAttribute("class", "modal__footer d-flex py-3");
    form.appendChild(footer);

    this._submit = document.createElement("input");
    this._submit.setAttribute("class", "btn btn-clear");
    this._submit.setAttribute("type", "submit");
    this._submit.setAttribute("disabled", "");
    this._submit.setAttribute("value", "Get token");
    footer.appendChild(this._submit);

    const messages = document.createElement("div");
    messages.setAttribute(
      "class",
      "main__header d-flex flex-column flex-items-center flex-justify-center py-6"
    );
    main.appendChild(messages);

    this._messageList = document.createElement("ul");
    this._messageList.setAttribute("class", "form-errors");
    messages.appendChild(this._messageList);

    const li = document.createElement("li");
    this._messageList.appendChild(li);

    this._refreshWarning = document.createElement("h3");
    this._refreshWarning.setAttribute("class", "h3 text-white");
    this._refreshWarning.setAttribute("style", "text-align:center;width:400px");
    this._refreshWarning.textContent =
      "Warning: Refreshing token will invalidate previous token!";
    this._refreshWarning.style.display = "none";
    li.appendChild(this._refreshWarning);

    this._dimmer = document.createElement("div");
    this._dimmer.setAttribute("class", "background-dimmer");
    this._shadow.appendChild(this._dimmer);

    this._username.addEventListener("input", this._validateForm.bind(this));
    this._password.addEventListener("input", this._validateForm.bind(this));
    this._refresh.addEventListener("change", this._validateForm.bind(this));

    this._modalNotify = document.createElement("modal-notify");
    div.appendChild(this._modalNotify);
    this._modalNotify.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );

    form.addEventListener("submit", (evt) => {
      evt.preventDefault();
      const body = {
        username: this._username.getValue(),
        password: this._password.getValue(),
        refresh: this._refresh.getValue(),
      };
      fetchCredentials("/rest/Token", {
        method: "POST",
        body: JSON.stringify(body),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.token) {
            this._modalNotify.init(
              "Your API token is:",
              data.token,
              "ok",
              "Close"
            );
            this._username.setValue("");
            this._password.setValue("");
          } else {
            this._modalNotify.init(
              "Token retrieval failed!",
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

  connectedCallback() {
    TatorPage.prototype.connectedCallback.call(this);
    // Initialize store data
    store.getState().init();
  }

  _validateForm() {
    const username = this._username.getValue();
    const password = this._password.getValue();
    const refresh = this._refresh.getValue();
    if (refresh) {
      this._refreshWarning.style.display = "block";
    } else {
      this._refreshWarning.style.display = "none";
    }
    if (username.length > 0 && password.length > 0) {
      this._submit.removeAttribute("disabled");
    } else {
      this._submit.setAttribute("disabled", "");
    }
  }
}

customElements.define("token-page", TokenPage);
