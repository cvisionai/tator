class AccountProfile extends TatorPage {
  constructor() {
    super();

    const main = document.createElement("main");
    main.setAttribute("class", "layout-max py-4");
    this._shadow.appendChild(main);

    const div = document.createElement("div");
    div.setAttribute("class", "main__header d-flex flex-items-center flex-justify-center py-6");
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

    const firstName = document.createElement("text-input");
    firstName.setAttribute("name", "First Name");
    firstName.setAttribute("type", "string");
    form.appendChild(firstName);

    const lastName = document.createElement("text-input");
    lastName.setAttribute("name", "Last Name");
    lastName.setAttribute("type", "string");
    form.appendChild(lastName);

    const email = document.createElement("text-input");
    email.setAttribute("name", "Email Address");
    email.setAttribute("type", "string");
    form.appendChild(email);

    const footer = document.createElement("div");
    footer.setAttribute("class", "modal__footer d-flex py-3");
    form.appendChild(footer);

    const submit = document.createElement("input");
    submit.setAttribute("class", "btn btn-clear");
    submit.setAttribute("type", "submit");
    submit.setAttribute("disabled", "");
    submit.setAttribute("value", "Update");
    footer.appendChild(submit);

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
      window.location.replace("/accounts/account-profile");
    });

    window.addEventListener("load", () => {
      fetch("/rest/User/GetCurrent", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      })
      .then(response => { return response.json(); })
      .then(result => {
        this.userId = result.id;
        userName.setValue(result.username);
        firstName.setValue(result.first_name);
        lastName.setValue(result.last_name);
        email.setValue(result.email);
      });
    });

    form.addEventListener("submit", evt => {
      evt.preventDefault();
      const url = "/rest/User/" + this.userId;
      fetch(url, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "first_name": firstName.getValue(),
          "last_name": lastName.getValue(),
          "email": email.getValue(),
        }),
      })
      .then( () => {
        this._modalNotify.init("Account Update", "Your account has been successfully updated!", "Ok");
        this._modalNotify.setAttribute("is-open", "");
        this.setAttribute("has-open-modal", "");
      })
      .catch(err => {
        console.log(err);
        Utilities.warningAlert("Account profile did not update", "#ff3e1d", false);
      });
    });
  }
}

customElements.define("account-profile", AccountProfile);
