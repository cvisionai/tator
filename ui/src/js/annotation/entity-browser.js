import { TatorElement } from "../components/tator-element.js";
import { identifyingAttribute } from "../util/identifying-attribute.js";
import { svgNamespace } from "../components/tator-element.js";

export class EntityBrowser extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "annotation__panel annotation__panel--entity rounded-2"
    );
    this._shadow.appendChild(div);

    const spacer = document.createElement("div");
    spacer.setAttribute("class", "px-4");
    div.appendChild(spacer);

    const header = document.createElement("div");
    header.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between"
    );
    spacer.appendChild(header);

    this._title = document.createElement("h3");
    this._title.setAttribute("class", "py-3 text-semibold");
    header.appendChild(this._title);

    const back = document.createElement("button");
    back.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center px-0 text-gray hover-text-white"
    );
    header.appendChild(back);

    const span = document.createElement("span");
    span.setAttribute("class", "f3");
    span.textContent = "Back";
    back.appendChild(span);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "f2 icon-chevron-right");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    back.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M12.943 24.943l8-8c0.521-0.521 0.521-1.365 0-1.885l-8-8c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l7.057 7.057-7.057 7.057c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0z"
    );
    svg.appendChild(path);

    const searchDiv = document.createElement("div");
    searchDiv.setAttribute("class", "annotation__panel-group py-3 d-flex");
    searchDiv.style.width = "fit-content";
    spacer.appendChild(searchDiv);

    this._search = document.createElement("filter-data-button");
    this._search.setAttribute("class", "d-flex");
    this._filterModal = document.createElement("annotation-filter-dialog");
    searchDiv.appendChild(this._search);
    searchDiv.appendChild(this._filterModal);

    const filterNotificationSpan = document.createElement("span");
    filterNotificationSpan.setAttribute(
      "class",
      "f3 text-green text-center d-flex flex-items-center px-3"
    );
    searchDiv.appendChild(filterNotificationSpan);
    this._filterNotificationSpan = filterNotificationSpan;
    const groupDiv = document.createElement("div");
    groupDiv.setAttribute("class", "text-gray f2");
    spacer.appendChild(groupDiv);

    this._group = document.createElement("enum-input");
    this._group.setAttribute("name", "Grouping");
    this._group.choices = [{ value: "Off" }];
    this._group.default = "Off";
    groupDiv.appendChild(this._group);

    this._jumpFrame = document.createElement("bool-input");
    this._jumpFrame.setAttribute("name", "Frame Seek");
    this._jumpFrame.setAttribute("off-text", "Manual");
    this._jumpFrame.setAttribute("on-text", "Auto");
    groupDiv.appendChild(this._jumpFrame);

    this._ul = document.createElement("ul");
    this._ul.setAttribute("class", "annotation__entities f2");
    div.appendChild(this._ul);

    this._selectors = {};
    this._attributes = {};
    this._initialized = false;
    this._media = null;
    this._mediaType = null;

    back.addEventListener("click", (evt) => {
      this.style.display = "none";
      this._closeAll();
      this.dispatchEvent(
        new CustomEvent("close", {
          detail: { typeId: this._dataType.id },
          composed: true,
        })
      );
    });
  }

  set permission(val) {
    this._permission = val;
    for (const key in this._selectors) {
      this._selectors[key].permission = val;
    }
    for (const key in this._attributes) {
      this._attributes[key].permission = val;
    }
  }

  set dataType(val) {
    this._identifier = identifyingAttribute(val);
    this._dataType = val;
    this._filterModal.dataType = val;
    this._title.textContent = this._dataType.name;
    let choices = [{ value: "Off" }];
    const sorted = this._dataType.attribute_types.sort(
      (a, b) => a.order - b.order
    );
    for (let choice of sorted) {
      if (choice.dtype == "string" || choice.dtype == "enum") {
        choices.push({ value: choice.name });
      }
    }
    this._group.clear();
    this._group.choices = choices;
    if (this._dataType.grouping_default && this._identifier) {
      this._group.setValue(this._identifier.name);
    } else {
      this._group.setValue("Off");
    }

    this._redrawEnabled = false;
    if (this._dataType.isLocalization) {
      this._redrawEnabled = true;
    }
  }

  set undoBuffer(val) {
    this._undo = val;
  }

  /**
   * @param {Object} evt
   *    event emitted from annotation-data "freshData"
   */
  updateData(evt) {
    if (evt.detail.typeObj.id === this._dataType.id) {
      if (!this._initialized) {
        this._initialized = true;
      }
      this._evt = evt;
      this._drawControls();

      if (this._selectEntityId != null) {
        for (let group in this._selectors) {
          this._selectors[group].selectEntityWithId(this._selectEntityId, true);
        }
        this._selectEntityId = null;
      }
    }
  }

  set annotationData(val) {
    this._data = val;
    this._jumpFrame.setValue(false);

    this._filterModal.data = this._data;
    this._search.addEventListener("click", (evt) => {
      this._filterModal.setAttribute("is-open", "");
      document.body.classList.add("shortcuts-disabled");
    });

    this._filterModal.addEventListener("close", (evt) => {
      this._filterModal.removeAttribute("is-open");
      document.body.classList.remove("shortcuts-disabled");
    });

    this._filterModal.addEventListener("annotationFilter", (evt) => {
      if (evt.detail.filterObject) {
        const encoded_query = btoa(JSON.stringify(evt.detail.filterObject));
        this._data.updateType(this._dataType, null, encoded_query);
        this._filterNotificationSpan.textContent = "Filters applied";
      } else {
        this._data.updateType(this._dataType, null);
        this._filterNotificationSpan.textContent = null;
      }

      // Close after filter is applied
      this._filterModal.removeAttribute("is-open");
      document.body.classList.remove("shortcuts-disabled");
    });
    this._group.addEventListener("change", (evt) => {
      this._drawControls();
    });
    this._jumpFrame.addEventListener("change", (evt) => {
      for (const group in this._selectors) {
        const selector = this._selectors[group];
        selector.autoGoToFrame = this._jumpFrame.getValue();
      }
    });
  }

  set canvas(obj) {
    this._canvas = obj;
  }

  set noFrames(val) {
    this._noFrames = val;
  }

  set media(val) {
    this._media = val;
  }

  set mediaType(val) {
    this._mediaType = val;
  }

  set browserSettings(val) {
    this._browserSettings = val;
  }

  _drawControls() {
    const evt = this._evt;
    let groups;
    if (this._identifier && this._group.getValue() != "Off") {
      const key = this._group.getValue();
      groups = evt.detail.data.reduce((sec, obj) => {
        (sec[obj["attributes"][key]] = sec[obj["attributes"][key]] || []).push(
          obj
        );
        return sec;
      }, {});
    } else {
      groups = {};
      if (evt.detail.data.length > 0) {
        const key = "All " + this._title.textContent;
        groups[key] = evt.detail.data;
      }
    }
    for (const group in groups) {
      if (this._dataType.isLocalization) {
        groups[group].sort((item_a, item_b) => {
          if (item_a.frame === item_b.frame) {
            return Date.parse(item_a.created_datetime) - Date.parse(item_b.created_datetime);
          }
          return item_a.frame - item_b.frame;
        });
      } else if (this._dataType.isTrack) {
        groups[group].sort((item_a, item_b) => {
          if (item_a.segments == null) {
            return -1;
          }
          if (item_b.segments == null) {
            return 1;
          }
          if (item_a.segments[0][0] == item_b.segments[0][0]) {
            return Date.parse(item_a.created_datetime) - Date.parse(item_b.created_datetime);
          }
          return item_a.segments[0][0] - item_b.segments[0][0];
        });
      } else {
        groups[group].sort((item_a, item_b) => {
          if (item_a.frame === item_b.frame) {
            return Date.parse(item_a.created_datetime) - Date.parse(item_b.created_datetime);
          }
          return item_a.frame - item_b.frame;
        });
      }
      if (group in this._selectors) {
        const selector = this._selectors[group];
        selector.update(groups[group]);
      } else {
        const li = document.createElement("li");
        this._ul.appendChild(li);

        const selector = document.createElement("entity-selector");
        selector.project = this._data._projectId;
        selector.noFrames = this._noFrames;
        selector.canvas = this._canvas;
        selector.permission = this._permission;
        selector.setAttribute("name", group);
        selector.dataType = this._dataType;
        selector.undoBuffer = this._undo;
        selector.globalDataBuffer = this._data;
        selector.update(groups[group]);
        li.appendChild(selector);
        this._selectors[group] = selector;

        if (!this._redrawEnabled) {
          selector.redrawEnabled = false;
        }

        if (!this._dataType.isTLState) {
          const attributes = document.createElement("attribute-panel");
          attributes.showHeader();
          attributes.browserSettings = this._browserSettings;
          attributes.enableBuiltInAttributes = true;
          attributes.setAssociatedMedia(this._media, this._mediaType);
          attributes.dataType = evt.detail.typeObj;
          if (typeof this._permission !== "undefined") {
            attributes.permission = this._permission;
          }
          attributes.setAttribute("in-entity-browser", "");
          li.appendChild(attributes);
          this._attributes[group] = attributes;

          attributes.addEventListener("focus", () => {
            document.body.classList.add("tab-disabled");
          });

          attributes.addEventListener("blur", () => {
            document.body.classList.remove("tab-disabled");
          });

          attributes.addEventListener("change", () => {
            const values = attributes.getValues();
            if (values !== null) {
              let endpoint;
              if (this._dataType.isLocalization) {
                endpoint = "Localization";
              } else {
                endpoint = "State";
              }
              const id = selector.data.id;
              let saved = false;
              if (
                this._data.getVersion().bases.indexOf(selector.data.version) >=
                0
              ) {
                let tweakedObj = Object.assign({}, selector.data);
                delete tweakedObj.version;
                tweakedObj.attributes = values;
                if (endpoint == "Localization") {
                  this._canvas.cloneToNewVersion(
                    tweakedObj,
                    this._data.getVersion().id
                  );
                } else if (endpoint == "State") {
                  let newObject = {};
                  let state = tweakedObj;
                  newObject.parent = state.id;
                  newObject.attributes = { ...values };
                  newObject.version = this._data.getVersion().id;
                  newObject.type = Number(state.type.split("_")[1]);
                  newObject.media_ids = state.media;
                  newObject.frame = state.frame;
                  newObject.localization_ids = state.localizations;
                  console.info(JSON.stringify(newObject));
                  this._undo.post("States", newObject, this._dataType);
                } else {
                  console.error(`Unknown endpoint '${endpoint}'`);
                }
                document.body.classList.remove("shortcuts-disabled");
                saved = true;
              } else if (this._data.getVersion().id == selector.data.version) {
                this._undo.patch(
                  endpoint,
                  id,
                  { attributes: values },
                  this._dataType
                );
                saved = true;
              }
              if (saved) {
                this.dispatchEvent(
                  new CustomEvent("save", {
                    detail: this._values,
                  })
                );
              }
            }
          });

          selector.addEventListener("select", (evt) => {
            attributes.setValues(
              evt.detail.data,
              evt.detail.associatedState,
              evt.detail.associatedStateType
            );
          });
        }

        selector.addEventListener("open", () => {
          li.classList.add("is-open");
          this._closeBesides(selector);
        });

        selector.addEventListener("close", () => {
          li.classList.remove("is-open");
        });
      }
    }
    for (const group in this._selectors) {
      if (!(group in groups)) {
        const li = this._selectors[group].parentNode;
        this._ul.removeChild(li);
        delete this._selectors[group];
        delete this._attributes[group];
      }
    }
  }

  selectEntityOnUpdate(entityId) {
    this._selectEntityId = entityId;
  }

  selectEntity(obj) {
    let group;
    if (
      this._identifier &&
      this._group.getValue() &&
      this._group.getValue() !== "Off"
    ) {
      group = obj.attributes[this._identifier.name];
    } else {
      group = "All " + this._title.textContent;
    }
    const selector = this._selectors[group];
    if (selector) {
      // Selector may not exist if element was deleted.
      selector.selectEntity(obj);
    } else {
      // It's possible the group has not been created yet with the update, so stage the update
      // This may need to be revisited if there's an asynchronous problem
      this.selectEntityOnUpdate(obj.id);
    }
  }

  frameChange(frame) {
    if (this._dataType.isTrack) {
      for (let groupId in this._attributes) {
        this._attributes[groupId].setFrame(frame);
      }
    }
  }

  redraw() {
    if (this._redrawEnabled) {
      for (const typeName in this._selectors) {
        if (this._selectors[typeName]._div.classList.contains("is-open")) {
          this._selectors[typeName]._redraw.click();
          break;
        }
      }
    }
  }

  deleteEntity() {
    for (const typeName in this._selectors) {
      if (this._selectors[typeName]._div.classList.contains("is-open")) {
        this._selectors[typeName]._del.click();
        break;
      }
    }
  }

  _closeBesides(selector) {
    for (const other in this._selectors) {
      if (selector.getAttribute("name") != other) {
        if (this._selectors[other]._div.classList.contains("is-open")) {
          this._selectors[other]._expand.click();
        }
      }
    }
  }

  _closeAll() {
    for (const name in this._selectors) {
      if (this._selectors[name]._div.classList.contains("is-open")) {
        this._selectors[name]._expand.click();
      }
    }
  }
}

customElements.define("entity-browser", EntityBrowser);
