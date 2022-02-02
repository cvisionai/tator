import { TatorElement } from "../../components/tator-element.js";
import { getCookie } from "../../util/get-cookie.js";

export class CustomForm extends TatorElement {
  constructor() {
    super();

    const form = document.createElement("form");
    form.setAttribute("class", "new-project__form rounded-2");
    this._shadow.appendChild(form);

    const div = document.createElement("div");
    div.setAttribute("class", "py-3 px-6");
    form.appendChild(div);

    const label = document.createElement("label");
    label.setAttribute("class", "d-flex flex-column py-2 text-semibold");
    div.appendChild(label);

    const span = document.createElement("span");
    span.setAttribute("class", "py-3");
    span.textContent = "New Project";
    label.appendChild(span);

    const input = document.createElement("input");
    input.setAttribute("class", "form-control");
    input.setAttribute("placeholder", "Project name");
    label.appendChild(input);

    const descLabel = document.createElement("label");
    descLabel.setAttribute("class", "d-flex flex-column py-2 text-semibold");
    div.appendChild(descLabel);

    const descSpan = document.createElement("span");
    descSpan.setAttribute("class", "py-3");
    descLabel.appendChild(descSpan);

    const textArea = document.createElement("textarea");
    textArea.setAttribute("class", "form-control lh-default");
    textArea.setAttribute("placeholder", "What is this project for?");
    descLabel.appendChild(textArea);

    // TODO: Add collaborator fields here.

    const footer = document.createElement("div");
    footer.setAttribute("class", "modal__footer d-flex");
    form.appendChild(footer);

    const submit = document.createElement("input");
    submit.setAttribute("class", "btn btn-clear");
    submit.setAttribute("type", "submit");
    submit.setAttribute("disabled", "");
    submit.setAttribute("value", "Create");
    footer.appendChild(submit);

    input.addEventListener("input", evt => {
      const re = RegExp("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$");
      if (re.test(evt.target.value)) {
        submit.removeAttribute("disabled");
      } else {
        submit.setAttribute("disabled", "");
      }
    });

    form.addEventListener("submit", evt => {
      evt.preventDefault();
      const name = input.value;
      const summary = textArea.value;
      fetch("/rest/Projects", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "name": name,
          "summary": summary
        }),
      })
      .then(window.location.replace("/projects"))
      .catch(err => console.log(err));
    });
  }
}

customElements.define("custom-form", CustomForm);
