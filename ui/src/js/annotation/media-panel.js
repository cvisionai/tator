import { TatorElement } from "../components/tator-element.js";

export class MediaPanel extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__panel px-4 rounded-2");
    this._shadow.appendChild(div);

    const headerDiv = document.createElement("div");
    headerDiv.setAttribute(
      "class",
      "d-flex flex-grow py-3 rounded-2 flex-justify-between flex-items-center"
    );
    div.appendChild(headerDiv);

    this._name = document.createElement("h3");
    this._name.setAttribute("class", "text-semibold css-truncate");
    headerDiv.appendChild(this._name);

    this._moreLessButton = document.createElement("div");
    this._moreLessButton.setAttribute("class", "f3 text-dark-gray px-3");
    this._moreLessButton.style.cursor = "pointer";
    this._moreLessButton.textContent = "Less -";
    headerDiv.appendChild(this._moreLessButton);

    const attrDiv = document.createElement("div");
    div.appendChild(attrDiv);

    this._attrs = document.createElement("attribute-panel");
    this._attrs.disableWidget("ID");
    this._attrs.disableWidget("Frame");
    this._attrs.disableWidget("Version");
    attrDiv.appendChild(this._attrs);

    const browserDiv = document.createElement("div");
    browserDiv.setAttribute("class", "annotation__panel px-4 rounded-2");
    this._shadow.appendChild(browserDiv);

    const browserHeaderDiv = document.createElement("div");
    browserHeaderDiv.setAttribute(
      "class",
      "d-flex flex-grow py-3 rounded-2 flex-justify-between flex-items-center"
    );
    browserDiv.appendChild(browserHeaderDiv);

    var entitiesHeader = document.createElement("h3");
    entitiesHeader.setAttribute("class", "text-semibold css-truncate");
    entitiesHeader.textContent = "Entities";
    browserHeaderDiv.appendChild(entitiesHeader);

    this._entitiesMoreLessButton = document.createElement("div");
    this._entitiesMoreLessButton.setAttribute(
      "class",
      "f3 text-dark-gray px-3"
    );
    this._entitiesMoreLessButton.style.cursor = "pointer";
    this._entitiesMoreLessButton.textContent = "Less -";
    browserHeaderDiv.appendChild(this._entitiesMoreLessButton);

    this._entities = document.createElement("div");
    this._entities.setAttribute(
      "class",
      "annotation__panel-group py-2 text-gray f2"
    );
    this._entities.style.display = "none";
    browserDiv.appendChild(this._entities);

    this._annotationData = null;
    this._dataTypes = null;

    this._moreLessButton.addEventListener("click", () => {
      this._moreLessButton.blur();
      if (this._moreLessButton.textContent.includes("More")) {
        this._attrs.showMore();
        this._moreLessButton.textContent = "Less -";
      } else {
        this._attrs.showLess();
        this._moreLessButton.textContent = "More +";
      }
    });

    this._entitiesMoreLessButton.addEventListener("click", () => {
      this._entitiesMoreLessButton.blur();
      if (this._entitiesMoreLessButton.textContent.includes("More")) {
        this.showEntities();
      } else {
        this._entities.style.display = "none";
        this._entitiesMoreLessButton.textContent = "More +";
      }
    });
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

  set mediaType(val) {
    // Setup the attribute display for the media
    this._mediaType = val;
    this._attrs.dataType = val;
    this._attrs.setValues(this._mediaData);
    this._attrs.addEventListener("change", () => {
      const values = this._attrs.getValues();
      if (values !== null) {
        const endpoint = "Media";
        const id = this._mediaData["id"];
        console.log("Media panel patch");
        this._undo.patch({
          detailUri: endpoint,
          id: id, 
          body: { attributes: values },
          dataType: val
        });
        this.dispatchEvent(
          new CustomEvent("save", {
            detail: this._values,
          })
        );
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
  set browserSettings(val) {
    this._browserSettings = val;
    this._attrs.browserSettings = this._browserSettings;

    let moreLessToggle = this._browserSettings.getMoreLess(this._mediaType);
    if (moreLessToggle == "more") {
      this._moreLessButton.textContent = "Less -";
    } else if (moreLessToggle == "less") {
      this._moreLessButton.textContent = "More +";
    }
  }

  showEntities() {
    this._entities.style.display = "block";
    this._entitiesMoreLessButton.textContent = "Less -";
  }

  _makeButtons() {
    const dataDefined = this._annotationData !== null;
    const typesDefined = this._dataTypes !== null;
    if (dataDefined && typesDefined) {
      for (const dataType of this._dataTypes) {
        if (dataType.visible) {
          this._entities.style.display = "block";
          const button = document.createElement("entity-button");
          button.dataType = dataType;
          button.annotationData = this._annotationData;
          this._entities.appendChild(button);
          button.addEventListener("click", (evt) => {
            this.dispatchEvent(
              new CustomEvent("open", {
                detail: { typeId: dataType.id },
                composed: true,
              })
            );
          });
        }
      }
    }
  }
}

customElements.define("media-panel", MediaPanel);
