class RegistrationPage extends TatorElement {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const div = document.createElement("div");
    div.setAttribute("class", "main__header d-flex flex-column flex-items-center flex-justify-center py-6");
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

    const userName = document.createElement("text-input");
    userName.setAttribute("name", "Username");
    userName.setAttribute("type", "string");
    form.appendChild(userName);

    const password1 = document.createElement("text-input");
    password1.setAttribute("name", "Password");
    password1.setAttribute("type", "password");
    form.appendChild(password1);

    const password2 = document.createElement("text-input");
    password2.setAttribute("name", "Password (confirm)");
    password2.setAttribute("type", "password");
    form.appendChild(password2);

    const firstName = document.createElement("text-input");
    firstName.setAttribute("name", "First name");
    firstName.setAttribute("type", "string");
    form.appendChild(firstName);

    const lastName = document.createElement("text-input");
    lastName.setAttribute("name", "Last name");
    lastName.setAttribute("type", "string");
    form.appendChild(lastName);

    const email = document.createElement("text-input");
    email.setAttribute("name", "Email address");
    email.setAttribute("type", "string");
    form.appendChild(email);

    const footer = document.createElement("div");
    footer.setAttribute("class", "modal__footer d-flex py-3");
    form.appendChild(footer);

    const submit = document.createElement("input");
    submit.setAttribute("class", "btn btn-clear");
    submit.setAttribute("type", "submit");
    submit.setAttribute("disabled", "");
    submit.setAttribute("value", "Register");
    footer.appendChild(submit);

    this._dimmer = document.createElement("div");
    this._dimmer.setAttribute("class", "background-dimmer");
    this._shadow.appendChild(this._dimmer);

    firstName.addEventListener("input", evt => {
      const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
      if (re.test(evt.target.value)) {
        submit.removeAttribute("disabled");
      } else {
        submit.setAttribute("disabled", "");
      }
    });

    lastName.addEventListener("input", evt => {
      const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
      if (re.test(evt.target.value)) {
        submit.removeAttribute("disabled");
      } else {
        submit.setAttribute("disabled", "");
      }
    });

    email.addEventListener("input", evt => {
      const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
      if (re.test(evt.target.value)) {
        submit.removeAttribute("disabled");
      } else {
        submit.setAttribute("disabled", "");
      }
    });

    this._modalNotify = document.createElement("modal-notify");
    div.appendChild(this._modalNotify);
    this._modalNotify.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
      window.location.replace("/registration");
    });

    form.addEventListener("submit", evt => {
      evt.preventDefault();
      const body = {
        first_name: firstName.getValue(),
        last_name: lastName.getValue(),
        email: email.getValue(),
        username: userName.getValue(),
        password: password1.getValue(),
      };
      const params = URLSearchParams(window.location.search);
      if (params.has("registration_token")) {
        body.registration_token = params.get("registration_token");
      }
      fetch("/rest/Users", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
      })
      .then( () => {
        this._modalNotify.init("Registration succeeded!", "Press Ok to continue to login screen.", "Ok");
        this._modalNotify.setAttribute("is-open", "");
        this.setAttribute("has-open-modal", "");
      })
      .catch(err => {
        console.log(err);
        Utilities.warningAlert("Registration failed!", "#ff3e1d", false);
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
}

customElements.define("registration-page", RegistrationPage);
