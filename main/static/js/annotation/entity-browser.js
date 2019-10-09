class EntityBrowser extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "annotation__panel annotation__panel--entity rounded-2");
    this._shadow.appendChild(div);

    const spacer = document.createElement("div");
    spacer.setAttribute("class", "px-4");
    div.appendChild(spacer);

    const header = document.createElement("div");
    header.setAttribute("class", "d-flex flex-items-center flex-justify-between");
    spacer.appendChild(header);

    this._title = document.createElement("h3");
    this._title.setAttribute("class", "py-3 text-semibold");
    header.appendChild(this._title);

    const back = document.createElement("button");
    back.setAttribute("class", "btn-clear d-flex flex-items-center px-0 text-gray hover-text-white");
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
    path.setAttribute("d", "M12.943 24.943l8-8c0.521-0.521 0.521-1.365 0-1.885l-8-8c-0.521-0.521-1.365-0.521-1.885 0s-0.521 1.365 0 1.885l7.057 7.057-7.057 7.057c-0.521 0.521-0.521 1.365 0 1.885s1.365 0.521 1.885 0z");
    svg.appendChild(path);

    this._ul = document.createElement("ul");
    this._ul.setAttribute("class", "annotation__entities f2");
    div.appendChild(this._ul);

    this._selectors = {};
    this._attributes = {};

    back.addEventListener("click", evt => {
      this.style.display = "none";
      this._closeAll();
      this.dispatchEvent(new CustomEvent("close", {
        detail: {typeId: this._dataType.type.id},
        composed: true,
      }));
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
    this._title.textContent = this._dataType.type.name;
  }

  set undoBuffer(val) {
    this._undo = val;
  }

  set annotationData(val) {
    this._data = val;
    this._data.addEventListener("freshData", evt => {
      if (evt.detail.typeObj.type.id === this._dataType.type.id) {
        let groups;
        if (this._identifier) {
          const key = this._identifier.name;
          groups = evt.detail.data.reduce((sec, obj) => {
            (sec[obj["attributes"][key]] = sec[obj["attributes"][key]] || []).push(obj);
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
                return item_a.id - item_b.id;
              }
              return item_a.frame - item_b.frame;
            });
          } else {
            groups[group].sort((item_a, item_b) => {
              if (item_a.association.frame === item_b.association.frame) {
                return item_a.id - item_b.id;
              }
              return item_a.association.frame - item_b.association.frame;
            });
          }
          if (group in this._selectors) {
            const selector = this._selectors[group];
            selector.update(groups[group]);
          } else {
            const li = document.createElement("li");
            this._ul.appendChild(li);

            const selector = document.createElement("entity-selector");
            selector.permission = this._permission;
            selector.setAttribute("name", group);
            selector.dataType = this._dataType;
            selector.undoBuffer = this._undo;
            selector.update(groups[group]);
            li.appendChild(selector);
            this._selectors[group] = selector;

            const haveAttributes = this._dataType.columns.length > 0;
            if ((!this._dataType.isTLState) && haveAttributes) {
              const attributes = document.createElement("attribute-panel");
              attributes.dataType = evt.detail.typeObj;
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
                    endpoint = "EntityState";
                  }
                  const id = selector.data.id;
                  this._undo.patch(endpoint, id, {"attributes": values}, this._dataType);
                  this.dispatchEvent(new CustomEvent("save", {
                    detail: this._values
                  }));
                }
              });

              selector.addEventListener("select", evt => {
                attributes.setValues(evt.detail.data);
              });
            };

            selector.addEventListener("open", () => {
              li.classList.add("is-open");
              this._closeBesides(selector);
              selector.scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "start",
              });
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
    });
  }

  selectEntity(obj) {
    let group;
    if (this._identifier) {
      group = obj.attributes[this._identifier.name];
    } else {
      group = "All " + this._title.textContent;
    }
    const selector = this._selectors[group];
    selector.selectEntity(obj);
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
