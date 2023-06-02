import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class ProjectSearch extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "project__search search d-flex position-relative"
    );
    this._shadow.appendChild(div);

    const label = document.createElement("label");
    label.setAttribute(
      "class",
      "circle d-inline-flex flex-items-center flex-justify-center f1"
    );
    label.setAttribute("for", "search-project");
    div.appendChild(label);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-search");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", ".9em");
    svg.setAttribute("width", ".9em");
    label.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Search";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M16.041 15.856c-0.034 0.026-0.067 0.055-0.099 0.087s-0.060 0.064-0.087 0.099c-0.627 0.604-1.365 1.091-2.18 1.429-0.822 0.34-1.725 0.529-2.675 0.529s-1.853-0.189-2.677-0.53c-0.856-0.354-1.627-0.874-2.273-1.521s-1.166-1.417-1.521-2.273c-0.34-0.823-0.529-1.726-0.529-2.676s0.189-1.853 0.53-2.677c0.354-0.855 0.874-1.627 1.52-2.273s1.418-1.166 2.273-1.52c0.824-0.341 1.727-0.53 2.677-0.53s1.853 0.189 2.677 0.53c0.856 0.354 1.627 0.874 2.273 1.521s1.166 1.417 1.521 2.273c0.34 0.823 0.529 1.726 0.529 2.676s-0.189 1.853-0.53 2.677c-0.338 0.815-0.825 1.553-1.429 2.18zM21.707 20.293l-3.675-3.675c0.525-0.656 0.96-1.387 1.286-2.176 0.44-1.062 0.682-2.225 0.682-3.442s-0.242-2.38-0.682-3.442c-0.456-1.102-1.125-2.093-1.954-2.922s-1.82-1.498-2.922-1.954c-1.062-0.44-2.225-0.682-3.442-0.682s-2.38 0.242-3.442 0.682c-1.102 0.456-2.093 1.125-2.922 1.954s-1.498 1.82-1.954 2.922c-0.44 1.062-0.682 2.225-0.682 3.442s0.242 2.38 0.682 3.442c0.456 1.102 1.125 2.093 1.954 2.922s1.82 1.498 2.922 1.954c1.062 0.44 2.225 0.682 3.442 0.682s2.38-0.242 3.442-0.682c0.788-0.327 1.52-0.762 2.176-1.286l3.675 3.675c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414z"
    );
    svg.appendChild(path);

    this._input = document.createElement("input");
    this._input.setAttribute(
      "class",
      "py-3 px-3 col-12 f2 text-white rounded-2 has-more"
    );
    this._input.setAttribute("autocomplete", "off");
    this._input.setAttribute("type", "search");
    this._input.setAttribute("id", "search-project");
    this._input.setAttribute("name", "q");
    div.appendChild(this._input);

    this._filtered_already = false;
    this._input.addEventListener("change", () => {
      // Update search params to new value
      let params = new URLSearchParams(document.location.search.substring(1));
      params.delete("search");
      if (this._input.value != "") {
        params.set("search", this._input.value);
      }

      const path = document.location.pathname;
      const searchArgs = params.toString();
      var newUrl = path;
      newUrl += "?" + searchArgs;

      if (this._filtered_already) {
        window.history.replaceState(this._input.value, "Filter", newUrl);
      } else {
        window.history.pushState(this._input.value, "Filter", newUrl);
        this._filtered_already = true;
      }

      this.dispatchEvent(
        new CustomEvent("filterProject", {
          composed: true,
          detail: { query: this._input.value },
        })
      );
    });

    // Update text from url
    let params = new URLSearchParams(document.location.search.substring(1));
    if (params.has("search")) {
      this._input.value = params.get("search");
    }
  }

  static get observedAttributes() {
    return ["project-name"];
  }

  get value() {
    return this._input.value;
  }

  set autocomplete(config) {
    TatorAutoComplete.enable(this._input, config);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-name":
        this._input.setAttribute("placeholder", "Search " + newValue + "...");
        break;
    }
  }
}

customElements.define("project-search", ProjectSearch);
