import { TatorElement } from "../../components/tator-element.js";
import { svgNamespace } from "../../components/tator-element.js";

export class FileTypeSelect extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("a");
    this._button.setAttribute("class", "btn btn-outline btn-small f2");
    this._button.style.width = "initial";
    this._button.textContent = "View files";
    this._shadow.appendChild(this._button);

    this._icon = document.createElement("div");
    this._icon.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-center"
    );
    this._shadow.appendChild(this._icon);
    this._icon.style.display = "none";

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "text-purple icon-eye");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._icon.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M0.106 11.553c-0.136 0.274-0.146 0.603 0 0.894 0.015 0.029 0.396 0.789 1.12 1.843 0.451 0.656 1.038 1.432 1.757 2.218 0.894 0.979 2.004 1.987 3.319 2.8 0.876 0.542 1.849 1 2.914 1.302 0.871 0.248 1.801 0.39 2.784 0.39s1.913-0.142 2.784-0.39c1.065-0.302 2.037-0.76 2.914-1.302 1.315-0.813 2.425-1.821 3.319-2.8 0.718-0.786 1.306-1.562 1.757-2.218 0.724-1.054 1.106-1.814 1.12-1.843 0.136-0.274 0.146-0.603 0-0.894-0.015-0.029-0.396-0.789-1.12-1.843-0.451-0.656-1.038-1.432-1.757-2.218-0.894-0.979-2.004-1.987-3.319-2.8-0.876-0.542-1.849-1-2.914-1.302-0.871-0.248-1.801-0.39-2.784-0.39s-1.913 0.142-2.784 0.39c-1.065 0.302-2.037 0.76-2.914 1.302-1.315 0.813-2.425 1.821-3.319 2.8-0.719 0.786-1.306 1.561-1.757 2.218-0.724 1.054-1.106 1.814-1.12 1.843zM2.141 12c0.165-0.284 0.41-0.687 0.734-1.158 0.41-0.596 0.94-1.296 1.585-2.001 0.805-0.881 1.775-1.756 2.894-2.448 0.743-0.459 1.547-0.835 2.409-1.079 0.703-0.2 1.449-0.314 2.237-0.314s1.534 0.114 2.238 0.314c0.862 0.245 1.666 0.62 2.409 1.079 1.119 0.692 2.089 1.567 2.894 2.448 0.644 0.705 1.175 1.405 1.585 2.001 0.323 0.471 0.569 0.873 0.734 1.158-0.165 0.284-0.41 0.687-0.734 1.158-0.41 0.596-0.94 1.296-1.585 2.001-0.805 0.881-1.775 1.756-2.894 2.448-0.743 0.459-1.547 0.835-2.409 1.079-0.704 0.2-1.45 0.314-2.238 0.314s-1.534-0.114-2.238-0.314c-0.862-0.245-1.666-0.62-2.409-1.079-1.119-0.692-2.089-1.567-2.894-2.448-0.644-0.705-1.175-1.405-1.585-2.001-0.323-0.471-0.569-0.874-0.733-1.158zM16 12c0-0.54-0.108-1.057-0.303-1.53-0.203-0.49-0.5-0.93-0.868-1.298s-0.809-0.666-1.299-0.869c-0.473-0.195-0.99-0.303-1.53-0.303s-1.057 0.108-1.53 0.303c-0.49 0.203-0.93 0.5-1.298 0.868s-0.666 0.809-0.869 1.299c-0.195 0.473-0.303 0.99-0.303 1.53s0.108 1.057 0.303 1.53c0.203 0.49 0.5 0.93 0.868 1.298s0.808 0.665 1.298 0.868c0.474 0.196 0.991 0.304 1.531 0.304s1.057-0.108 1.53-0.303c0.49-0.203 0.93-0.5 1.298-0.868s0.665-0.808 0.868-1.298c0.196-0.474 0.304-0.991 0.304-1.531zM14 12c0 0.273-0.054 0.53-0.151 0.765-0.101 0.244-0.25 0.464-0.435 0.65s-0.406 0.334-0.65 0.435c-0.234 0.096-0.491 0.15-0.764 0.15s-0.53-0.054-0.765-0.151c-0.244-0.101-0.464-0.25-0.65-0.435s-0.334-0.406-0.435-0.65c-0.096-0.234-0.15-0.491-0.15-0.764s0.054-0.53 0.151-0.765c0.101-0.244 0.25-0.464 0.435-0.65s0.406-0.334 0.65-0.435c0.234-0.096 0.491-0.15 0.764-0.15s0.53 0.054 0.765 0.151c0.244 0.101 0.464 0.25 0.65 0.435s0.334 0.406 0.435 0.65c0.096 0.234 0.15 0.491 0.15 0.764z"
    );
    svg.appendChild(path);

    const span = document.createElement("span");
    span.setAttribute(
      "class",
      "px-2 f3 text-uppercase text-gray text-semibold"
    );
    span.textContent = "Viewing";
    this._icon.appendChild(span);

    this._button.addEventListener("click", () => {
      this.select(false);
    });
  }

  init(fileType) {
    this._fileType = fileType;
  }

  select(suppressEvent) {
    this._icon.style.display = "flex";
    this._button.style.display = "none";
    if (!suppressEvent) {
      this.dispatchEvent(
        new CustomEvent("select", {
          detail: {
            fileType: this._fileType,
          },
        })
      );
    }
  }

  deselect() {
    this._icon.style.display = "none";
    this._button.style.display = "flex";
  }
}

customElements.define("file-type-select", FileTypeSelect);
