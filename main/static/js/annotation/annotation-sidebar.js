class AnnotationSidebar extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "annotation__sidebar d-flex flex-column flex-items-center py-3 px-3 position-relative");
    this._shadow.appendChild(this._div);

    this._edit = document.createElement("edit-button");
    this._edit.classList.add("is-selected");
    this._div.appendChild(this._edit);

    this._box = document.createElement("box-button");
    this._div.appendChild(this._box);

    this._line = document.createElement("line-button");
    this._div.appendChild(this._line);

    this._point = document.createElement("point-button");
    this._div.appendChild(this._point);

    const zoomIn = document.createElement("zoom-in-button");
    this._div.appendChild(zoomIn);

    const zoomOut = document.createElement("zoom-out-button");
    this._div.appendChild(zoomOut);

    const pan = document.createElement("pan-button");
    this._div.appendChild(pan);

    this._indicator = document.createElement("span");
    this._indicator.setAttribute("class", "annotation__shape-indicator");
    this._div.appendChild(this._indicator);

    this._edit.addEventListener("click", () => {
      document.body.style.cursor = "default";
      this._selectButton(this._edit);
      this.dispatchEvent(new Event("default"));
    });

    zoomIn.addEventListener("click", () => {
      document.body.style.cursor = "zoom-in";
      this._selectButton(zoomIn);
      this.dispatchEvent(new Event("zoomIn"));
    });

    zoomOut.addEventListener("click", () => {
      this.dispatchEvent(new Event("zoomOut"));
      zoomOut.blur();
    });

    pan.addEventListener("click", () => {
      document.body.style.cursor = "move";
      this._selectButton(pan);
      this.dispatchEvent(new Event("pan"));
    });

    document.addEventListener("keydown", evt => {
      if (document.body.classList.contains("shortcuts-disabled")) {
        return;
      }
      if (evt.keyCode == 27) {
        this._edit.click();
      } else if (evt.keyCode == 187 || evt.keyCode == 107) {
        zoomIn.click();
      } else if (evt.keyCode == 189 || evt.keyCode == 109) {
        zoomOut.click();
      }
    });
  }

  set localizationTypes(val) {
    if (typeof val.box !== "undefined") {
      this._box.addEventListener("click", (evt) => {
        document.body.style.cursor = "crosshair";
        this._selectButton(this._box, evt.shiftKey);
        this.dispatchEvent(new CustomEvent("newMeta", {
          detail: {typeId: val.box[0].type.id,
                   metaMode: evt.shiftKey} // TODO: handle multiple box types
        }));
      });
      document.addEventListener("keydown", evt => {
        if (document.body.classList.contains("shortcuts-disabled")) {
          return;
        }
        if (evt.keyCode === 66) {
          this._box.dispatchEvent(new MouseEvent("click", {"shiftKey": evt.shiftKey}));
        }
      });
    } else {
      this._box.setAttribute("disabled", "");
    }

    if (typeof val.line !== "undefined") {
      this._line.addEventListener("click", (evt) => {
        document.body.style.cursor = "crosshair";
        this._selectButton(this._line, evt.shiftKey);
        this.dispatchEvent(new CustomEvent("newMeta", {
          detail: {typeId: val.line[0].type.id,
                   metaMode: evt.shiftKey} // TODO: handle multiple line types
        }));
      });
      document.addEventListener("keydown", evt => {
        if (document.body.classList.contains("shortcuts-disabled")) {
          return;
        }
        if (evt.keyCode === 76) {
          this._line.dispatchEvent(new MouseEvent("click", {shiftKey: evt.shiftKey}));
        }
      });
    } else {
      this._line.setAttribute("disabled", "");
    }

    if (typeof val.dot !== "undefined") {
      this._point.addEventListener("click", (evt) => {
        document.body.style.cursor = "crosshair";
        this._selectButton(this._point, evt.shiftKey);
        this.dispatchEvent(new CustomEvent("newMeta", {
          detail: {typeId: val.dot[0].type.id,
                   metaMode: evt.shiftKey} // TODO: handle multiple point types
        }));
      });
      document.addEventListener("keydown", evt => {
        if (document.body.classList.contains("shortcuts-disabled")) {
          return;
        }
        if (evt.keyCode === 80) {
          this._point.dispatchEvent(new MouseEvent("click", {shiftKey: evt.shiftKey}));
        }
      });
    } else {
      this._point.setAttribute("disabled", "");
    }
  }

  _selectButton(obj, altMode) {
    if (altMode)
    {
      this._indicator.style.background="#A2AFCD"; //From CSS file
    }
    else
    {
      this._indicator.style.width=null;
      this._indicator.style.background=null;
    }
    for (const button of this._div.children) {
      if (obj === button) {
        button.classList.add("is-selected");

      } else {
        button.classList.remove("is-selected");
        button.blur();
      }
    }
  }

  selectDefault() {
    this._edit.click();
  }
}

customElements.define("annotation-sidebar", AnnotationSidebar);
