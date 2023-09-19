import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";

export class AnnotationSidebar extends TatorElement {
  constructor() {
    super();

    this._main = document.createElement("div");
    this._main.setAttribute("class", "d-flex flex-row");
    this._shadow.appendChild(this._main);

    this._div = document.createElement("div");
    this._div.setAttribute(
      "class",
      "annotation__sidebar d-flex flex-column flex-items-center py-3 px-3 position-relative"
    );
    this._main.appendChild(this._div);

    this._hiddenDiv = document.createElement("div");
    this._hiddenDiv.setAttribute("class", "");
    this._main.appendChild(this._hiddenDiv);

    this._edit = document.createElement("edit-button");
    this._edit.classList.add("is-selected");
    this._div.appendChild(this._edit);

    this._box = document.createElement("box-button");
    this._div.appendChild(this._box);

    this._line = document.createElement("line-button");
    this._div.appendChild(this._line);

    this._point = document.createElement("point-button");
    this._div.appendChild(this._point);

    this._poly = document.createElement("poly-button");
    this._div.appendChild(this._poly);

    this._track = document.createElement("track-button");
    this._div.appendChild(this._track);

    const zoomIn = document.createElement("zoom-in-button");
    this._div.appendChild(zoomIn);

    const zoomOut = document.createElement("zoom-out-button");
    this._div.appendChild(zoomOut);

    this._pan = document.createElement("pan-button");
    this._div.appendChild(this._pan);

    this._indicator = document.createElement("span");
    this._indicator.setAttribute("class", "annotation__shape-indicator");
    this._div.appendChild(this._indicator);

    this._buttons = [
      this._edit,
      this._box,
      this._line,
      this._point,
      this._poly,
      this._track,
      zoomIn,
      zoomOut,
      this._pan,
    ];

    this._edit.addEventListener("click", () => {
      this._selectButton(this._edit);
      this.dispatchEvent(new Event("default"));
    });

    zoomIn.addEventListener("click", () => {
      this._selectButton(zoomIn);
      this.dispatchEvent(new Event("zoomIn"));
    });

    zoomOut.addEventListener("click", () => {
      this.dispatchEvent(new Event("zoomOut"));
      zoomOut.blur();
    });

    this._pan.addEventListener("click", () => {
      this._selectButton(this._pan);
      this.dispatchEvent(new Event("pan"));
    });

    document.addEventListener("keydown", (evt) => {
      if (document.body.classList.contains("shortcuts-disabled")) {
        return;
      }
      if (evt.ctrlKey) {
        if (evt.key == "p") {
          evt.preventDefault();
          evt.stopPropagation();
          pan.click();
        }
      } else {
        if (evt.key == "Escape") {
          this._edit.click();
        } else if (evt.key == "+") {
          zoomIn.click();
        } else if (evt.key == "-") {
          zoomOut.click();
        }
      }
    });
  }

  set permission(val) {
    if (hasPermission(val, "Can Edit")) {
      if (!this._box.permanentDisable) this._box.removeAttribute("disabled");
      if (!this._line.permanentDisable) this._line.removeAttribute("disabled");
      if (!this._point.permanentDisable)
        this._point.removeAttribute("disabled");
      if (!this._poly.permanentDisable) this._poly.removeAttribute("disabled");
      if (!this._track.permanentDisable)
        this._track.removeAttribute("disabled");
    } else {
      this._box.setAttribute("disabled", "");
      this._line.setAttribute("disabled", "");
      this._point.setAttribute("disabled", "");
      this._track.setAttribute("disabled", "");
    }
  }

  set localizationTypes(val) {
    if (typeof val.box !== "undefined") {
      this._box.addEventListener("click", (evt) => {
        this._selectButton(this._box, evt.shiftKey);
        this.dispatchEvent(
          new CustomEvent("newMeta", {
            detail: { typeId: val.box[0].id, metaMode: evt.shiftKey }, // TODO: handle multiple box types
          })
        );
      });
      document.addEventListener("keydown", (evt) => {
        if (document.body.classList.contains("shortcuts-disabled")) {
          return;
        }
        if (evt.keyCode === 66) {
          this._box.dispatchEvent(
            new MouseEvent("click", { shiftKey: evt.shiftKey })
          );
        }
      });
    } else {
      this._box.setAttribute("disabled", "");
      this._box.permanentDisable = true;
    }

    if (typeof val.line !== "undefined") {
      this._line.addEventListener("click", (evt) => {
        this._selectButton(this._line, evt.shiftKey);
        this.dispatchEvent(
          new CustomEvent("newMeta", {
            detail: { typeId: val.line[0].id, metaMode: evt.shiftKey }, // TODO: handle multiple line types
          })
        );
      });
      document.addEventListener("keydown", (evt) => {
        if (document.body.classList.contains("shortcuts-disabled")) {
          return;
        }
        if (evt.keyCode === 76) {
          this._line.dispatchEvent(
            new MouseEvent("click", { shiftKey: evt.shiftKey })
          );
        }
      });
    } else {
      this._line.setAttribute("disabled", "");
      this._line.permanentDisable = true;
    }

    if (typeof val.dot !== "undefined") {
      this._point.addEventListener("click", (evt) => {
        this._selectButton(this._point, evt.shiftKey);
        this.dispatchEvent(
          new CustomEvent("newMeta", {
            detail: { typeId: val.dot[0].id, metaMode: evt.shiftKey }, // TODO: handle multiple point types
          })
        );
      });
      document.addEventListener("keydown", (evt) => {
        if (document.body.classList.contains("shortcuts-disabled")) {
          return;
        }
        if (evt.keyCode === 80) {
          this._point.dispatchEvent(
            new MouseEvent("click", { shiftKey: evt.shiftKey })
          );
        }
      });
    } else {
      this._point.setAttribute("disabled", "");
      this._point.permanentDisable = true;
    }

    if (typeof val.poly !== "undefined") {
      this._poly.addEventListener("click", (evt) => {
        this._selectButton(this._poly, evt.shiftKey);
        this.dispatchEvent(
          new CustomEvent("newMeta", {
            detail: { typeId: val.poly[0].id, metaMode: evt.shiftKey },
          })
        );
      });
      document.addEventListener("keydown", (evt) => {
        if (document.body.classList.contains("shortcuts-disabled")) {
          return;
        }
        if (evt.keyCode === 80) {
          this._poly.dispatchEvent(
            new MouseEvent("click", { shiftKey: evt.shiftKey })
          );
        }
      });
    } else {
      this._poly.setAttribute("disabled", "");
      this._poly.permanentDisable = true;
    }
  }

  set trackTypes(val) {
    if (val.length > 0) {
      this._track.addEventListener("click", (evt) => {
        this._selectButton(this._track, true);
        this.dispatchEvent(
          new CustomEvent("newMeta", {
            detail: { typeId: val[0].id, metaMode: true },
          })
        );
      });
      document.addEventListener("keydown", (evt) => {
        if (document.body.classList.contains("shortcuts-disabled")) {
          return;
        }
        if (evt.keyCode === 84) {
          this._track.dispatchEvent(new MouseEvent("click"));
        }
      });
    } else {
      this._track.setAttribute("disabled", "");
      this._track.permanentDisable = true;
    }
  }

  modeChange(newMode, metaMode) {
    if (newMode == "new_poly") {
      this._selectButton(this._poly, metaMode);
    }
    if (newMode == "pan") {
      this._selectButton(this._pan, metaMode);
      this.dispatchEvent(new Event("pan"));
    }
    if (newMode == "query") {
      this._selectButton(this._edit, metaMode);
      this.dispatchEvent(new Event("default"));
    } else {
      console.info(`Mode change to ${newMode} ignored.`);
    }
  }

  _selectButton(obj, altMode) {
    if (altMode) {
      this._indicator.style.background = "#A2AFCD"; //From CSS file
    } else {
      this._indicator.style.width = null;
      this._indicator.style.background = null;
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

  addAppletPanel(panel, trigger) {
    this._hiddenDiv.appendChild(panel);
    this._div.appendChild(trigger);
  }

  set videoIsPlaying(val) {
    for (let button of this._buttons) {
      if (val == true) {
        button.setAttribute("disabled", "");
      } else {
        button.removeAttribute("disabled");
      }
    }
  }
}

customElements.define("annotation-sidebar", AnnotationSidebar);
