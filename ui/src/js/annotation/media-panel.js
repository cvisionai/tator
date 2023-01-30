import { TatorElement } from "../components/tator-element.js";

export class MediaPanel extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__panel px-4 rounded-2");
    this._shadow.appendChild(div);

    this._name = document.createElement("h3");
    this._name.setAttribute("class", "py-3 text-semibold css-truncate");
    div.appendChild(this._name);

    this._attrs = document.createElement("attribute-panel");
    this._attrs._versionWidget.style.display = "none";
    div.appendChild(this._attrs);

    const browserDiv = document.createElement("div");
    browserDiv.setAttribute("class", "annotation__panel px-4 rounded-2");
    this._shadow.appendChild(browserDiv);

    this._entities = document.createElement("div");
    this._entities.setAttribute("class", "annotation__panel-group py-2 text-gray f2");
    this._entities.style.display = "none";
    browserDiv.appendChild(this._entities);

    this._annotationData = null;
    this._dataTypes = null;
  }

  set permission(val) {
    this._attrs.permission = val;
  }

  set mediaInfo(val) {
    this._name.textContent = val.name;
    this._mediaData = val;
  }

  set undoBuffer(val) {
    this._undo = val;
  }

  set mediaType(val)
  {
    // Setup the attribute display for the media
    this._attrs.dataType = val;
    this._attrs.setValues(this._mediaData);
    this._attrs.addEventListener("change", () => {
    const values = this._attrs.getValues();
    if (values !== null) {
      const endpoint="Media";
      const id = this._mediaData['id'];
      this._undo.patch(endpoint, id, {"attributes": values}, val);
      this.dispatchEvent(new CustomEvent("save", {
        detail: this._values
      }));
    }
    });
  }

  set annotationData(val) {
    this._annotationData = val;
    this._makeButtons();
  }

  set dataTypes(val) {
    this._dataTypes = val;
    this._makeButtons();
  }

  _makeButtons() {
    const dataDefined = this._annotationData !== null;
    const typesDefined = this._dataTypes !== null;
    if (dataDefined && typesDefined) {
      let first = true;
      for (const dataType of this._dataTypes) {
        if (dataType.visible) {
          const button = document.createElement("entity-button");
          button.dataType = dataType;
          button.annotationData = this._annotationData;
          if (first) {
            this._entities.style.display = "block";
            button.setAttribute("label", "Entities");
            first = false;
          }
          this._entities.appendChild(button);
          button.addEventListener("click", evt => {
            this.dispatchEvent(new CustomEvent("open", {
              detail: {typeId: dataType.id},
              composed: true,
            }));
          });
        }
      }
    }
  }
}

customElements.define("media-panel", MediaPanel);
