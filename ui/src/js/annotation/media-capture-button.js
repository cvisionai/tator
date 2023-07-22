import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";

export class MediaCaptureButton extends TatorElement {
  constructor() {
    super();

    const details = document.createElement("details");
    details.setAttribute("class", "position-relative");
    this._shadow.appendChild(details);

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.setAttribute("class", "d-flex flex-items-center rounded-1");
    details.appendChild(summary);

    const button = document.createElement("div");
    button.setAttribute(
      "class",
      "d-flex px-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
    );
    summary.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("fill", "none");
    // override CSS for this icon
    svg.style.fill = "none";
    svg.style.marginTop = "60%";
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Capture View";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
    );
    svg.appendChild(path);

    const circle = document.createElementNS(svgNamespace, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "13");
    circle.setAttribute("r", "4");
    svg.appendChild(circle);

    const div = document.createElement("div");
    div.setAttribute("class", "more py-2 px-2");
    div.style.width = "300px"; //todo: figure out how to make this smaller
    div.style.align = "center";
    details.appendChild(div);

    const localizations = document.createElement("bool-input");
    localizations.setAttribute("name", "Localizations");
    localizations.setAttribute("on-text", "On");
    localizations.setAttribute("off-text", "Off");
    localizations.setValue(true);
    div.appendChild(localizations);

    const centerDiv = document.createElement("div");
    centerDiv.setAttribute(
      "class",
      "dflex flex-items-center flex-justify-center"
    );
    div.appendChild(centerDiv);
    const submit = document.createElement("button");
    submit.setAttribute(
      "class",
      "btn-clear d-flex px-2 py-2 rounded-1 f2 text-gray hover-text-white annotation__setting"
    );
    submit.style = "margin-left: 135px;";
    const svg2 = svg.cloneNode(true);
    svg2.style.marginTop = null;
    submit.appendChild(svg2);
    centerDiv.appendChild(submit);
    submit.addEventListener("click", () => {
      const detail = { localizations: localizations.getValue() };
      this.dispatchEvent(
        new CustomEvent("captureFrame", { composed: true, detail: detail })
      );
      submit.blur();
    });
  }
}

customElements.define("media-capture-button", MediaCaptureButton);
