import { UploadElement } from "../components/upload-element.js";

export class NewSection extends UploadElement {
  constructor() {
    super();

    this._details = document.createElement("details");
    this._details.setAttribute(
      "class",
      "project__section project__section--new"
    );
    this._shadow.appendChild(this._details);

    const summary = document.createElement("summary");
    summary.setAttribute(
      "class",
      "project__header d-flex flex-items-center flex-justify-between"
    );
    this._details.appendChild(summary);

    const h2 = document.createElement("h2");
    h2.setAttribute(
      "class",
      "d-flex flex-items-center col-12 h3 text-gray hover-text-white"
    );
    summary.appendChild(h2);

    const span = document.createElement("span");
    span.setAttribute("class", "clickable");
    span.textContent = "+ New Folder";
    h2.appendChild(span);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex");
    this._details.appendChild(div);

    const drop = document.createElement("div");
    drop.setAttribute(
      "class",
      "project__file--is-empty add-new d-flex flex-items-center flex-justify-center flex-column col-9 rounded-2"
    );
    div.appendChild(drop);

    const label = document.createElement("label");
    label.setAttribute("class", "btn");
    label.textContent = "Upload Files";
    drop.appendChild(label);

    const input = document.createElement("input");
    input.setAttribute("class", "sr-only");
    input.setAttribute("type", "file");
    input.setAttribute("multiple", "");
    label.appendChild(input);

    const info = document.createElement("div");
    info.setAttribute("class", "f2 text-gray");
    info.textContent = "Or drag and drop here";
    drop.appendChild(info);

    drop.addEventListener("dragover", (evt) => {
      evt.preventDefault();
    });
    drop.addEventListener("drop", this._fileSelectCallback);
    input.addEventListener("change", this._fileSelectCallback);
  }

  static get observedAttributes() {
    return UploadElement.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    UploadElement.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
  }

  close() {
    this._details.removeAttribute("open");
  }
}

customElements.define("new-section", NewSection);
