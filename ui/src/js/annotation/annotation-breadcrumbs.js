import { TatorElement } from "../components/tator-element.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class AnnotationBreadcrumbs extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "annotation__breadcrumbs d-flex px-3 f3 text-gray flex-column"
    );
    this._shadow.appendChild(div);

    const topDiv = document.createElement("div");
    topDiv.setAttribute("class", "d-flex flex-items-center mb-1");
    div.appendChild(topDiv);

    const bottomDiv = document.createElement("div");
    bottomDiv.setAttribute("class", "d-flex flex-items-center");
    div.appendChild(bottomDiv);

    this._projectText = document.createElement("a");
    this._projectText.setAttribute("class", "text-dark-gray");
    bottomDiv.appendChild(this._projectText);

    const chevron1 = document.createElement("chevron-right");
    chevron1.setAttribute("class", "px-1 text-dark-gray");
    bottomDiv.appendChild(chevron1);

    this._sectionText = document.createElement("a");
    this._sectionText.setAttribute("class", "text-dark-gray");
    this._sectionText.setAttribute("href", this._sectionUrl());
    bottomDiv.appendChild(this._sectionText);

    this._fileText = document.createElement("span");
    this._fileText.setAttribute("class", "text-white text-semibold");
    topDiv.appendChild(this._fileText);

    this._posText = document.createElement("span");
    this._posText.setAttribute("class", "text-gray px-1");
    topDiv.appendChild(this._posText);

    this._sectionName();
  }

  static get observedAttributes() {
    return ["project-name", "section-name", "media-name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-name":
        this._projectText.textContent = newValue;
        this._projectText.setAttribute("href", this._detailUrl());
        break;
      case "section-name":
        break;
      case "media-name":
        this._fileText.textContent = newValue;
        break;
    }
  }

  setPosition(pos, count) {
    this._posText.textContent = `(${pos} of ${count})`;
  }

  _detailUrl() {
    const project = window.location.pathname.split("/")[1];
    return `${window.location.origin}/${project}/project-detail`;
  }

  _sectionUrl() {
    const params = new URLSearchParams(document.location.search.substring(1));
    const sectionParams = new URLSearchParams();
    if (params.has("search")) {
      sectionParams.set("search", params.get("search"));
    }
    if (params.has("section")) {
      sectionParams.set("section", params.get("section"));
    }
    return `${this._detailUrl()}?${sectionParams.toString()}`;
  }

  _sectionName() {
    const params = new URLSearchParams(document.location.search.substring(1));
    if (params.has("section")) {
      fetchCredentials(`/rest/Section/${params.get("section")}`, {}, true)
        .then((response) => response.json())
        .then((section) => {
          let innerHTML = `<div class="d-flex flex-items-center">`;
          let parts = section.name.split(".");
          innerHTML += parts.join(
            ` <chevron-right class="px-1"></chevron-right> `
          );
          innerHTML += `</div>`;
          this._sectionText.innerHTML = innerHTML;
        });
    } else {
      this._sectionText.innerHTML = "All Media";
    }
  }
}

customElements.define("annotation-breadcrumbs", AnnotationBreadcrumbs);
