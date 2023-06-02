import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class EntityMore extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute("class", "btn-clear h2 text-gray hover-text-white");
    button.setAttribute(
      "class",
      "btn-clear h2 text-gray hover-text-white d-flex flex-justify-center "
    );
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-more-vertical");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "More";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M14 12c0-0.552-0.225-1.053-0.586-1.414s-0.862-0.586-1.414-0.586-1.053 0.225-1.414 0.586-0.586 0.862-0.586 1.414 0.225 1.053 0.586 1.414 0.862 0.586 1.414 0.586 1.053-0.225 1.414-0.586 0.586-0.862 0.586-1.414zM14 5c0-0.552-0.225-1.053-0.586-1.414s-0.862-0.586-1.414-0.586-1.053 0.225-1.414 0.586-0.586 0.862-0.586 1.414 0.225 1.053 0.586 1.414 0.862 0.586 1.414 0.586 1.053-0.225 1.414-0.586 0.586-0.862 0.586-1.414zM14 19c0-0.552-0.225-1.053-0.586-1.414s-0.862-0.586-1.414-0.586-1.053 0.225-1.414 0.586-0.586 0.862-0.586 1.414 0.225 1.053 0.586 1.414 0.862 0.586 1.414 0.586 1.053-0.225 1.414-0.586 0.586-0.862 0.586-1.414z"
    );
    svg.appendChild(path);
  }
}

customElements.define("entity-more", EntityMore);
