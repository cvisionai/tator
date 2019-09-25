class MediaPanel extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__panel px-4 rounded-2");
    this._shadow.appendChild(div);

    this._name = document.createElement("h3");
    this._name.setAttribute("class", "py-3 text-semibold css-truncate");
    div.appendChild(this._name);

    this._attrs = document.createElement("attribute-panel");
    this._attrs.setAttribute("in-entity-browser", true);

    div.appendChild(this._attrs); // TODO: Fill this in with attribute data

    this._entities = document.createElement("div");
    this._entities.setAttribute("class", "annotation__panel-group py-2 text-gray f2");
    this._entities.style.display = "none";
    div.appendChild(this._entities);

    this._annotationData = null;
    this._dataTypes = null;
  }

  set mediaInfo(val) {
    this._name.textContent = val.name;
    this._mediaData = val;
  }

  set mediaType(val)
  {
    if (val.columns.length == 0)
    {
      // Hide the attribute viewer is there are none.
      this._attrs.style.display="none";
    }
    else
    {
      // Setup the attribute display for the media
      this._attrs.dataType = val;
      this._attrs.setValues(this._mediaData);
    }
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
        if (dataType.type.visible) {
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
              detail: {typeId: dataType.type.id},
              composed: true,
            }));
          });
        }
      }
    }
  }
}

customElements.define("media-panel", MediaPanel);
