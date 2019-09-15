class AlgorithmButton extends TatorElement {
  constructor() {
    super();

    const details = document.createElement("details");
    details.setAttribute("class", "main__header px-2 position-relative");
    this._shadow.appendChild(details);

    const summary = document.createElement("summary");
    summary.setAttribute("class", "btn btn-clear btn-outline");
    details.appendChild(summary);

    const span = document.createElement("span");
    span.setAttribute("class", "d-flex flex-items-center flex-justify-center height-full");
    span.textContent = "Run Algorithm";
    summary.appendChild(span);

    const div = document.createElement("div");
    div.setAttribute("class", "more d-flex flex-column f2");
    details.appendChild(div);

    this._algorithmMenu = document.createElement("algorithm-menu");
    div.appendChild(this._algorithmMenu);

    this._algorithmMenu.addEventListener("click", () => {
      details.removeAttribute("open");
    });
  }

  static get observedAttributes() {
    return ["project-id"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-id":
        this._algorithmMenu.addEventListener("algorithmMenu", evt => {
          fetch("/rest/AlgorithmLaunch/" + newValue, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              "algorithm_name": evt.detail.algorithmName,
            }),
          })
          .then(response => {
            const page = document.querySelector("project-detail");
            if (response.status == 201) {
              page._progress.notify("Algorithm launched!", true);
            } else {
              //page._progress.error("Error launching algorithm!");
            }
            return response.json();
          })
          .then(data => console.log(data));
        });
        break;
    }
  }

  set algorithms(val) {
    this._algorithmMenu.algorithms = val;
  }
}

customElements.define("algorithm-button", AlgorithmButton);
