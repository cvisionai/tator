class SaveDialog extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "annotation__panel--popup annotation__panel px-4 rounded-2");
    this._shadow.appendChild(this._div);

    const header = document.createElement("div");
    header.setAttribute("class", "d-flex flex-items-center flex-justify-between py-3");
    this._div.appendChild(header);

    this._span = document.createElement("span");
    this._span.setAttribute("class", "text-semibold");
    header.appendChild(this._span);

    this._attributes = document.createElement("attribute-panel");
    this._div.appendChild(this._attributes);

    this._recents = document.createElement("recents-panel");
    this._div.appendChild(this._recents);

    const buttons = document.createElement("div");
    buttons.setAttribute("class", "d-flex flex-items-center py-4");
    this._div.appendChild(buttons);

    this._save = document.createElement("button");
    this._save.setAttribute("class", "btn btn-clear");
    this._save.setAttribute("disabled", "");
    this._save.textContent = "Save";
    buttons.appendChild(this._save);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn-clear px-4 text-gray hover-text-white");
    cancel.textContent = "Cancel";
    buttons.appendChild(cancel);

    this._attributes.addEventListener("change", () => {
      this._values = this._attributes.getValues();
      if (this._values === null) {
        this._save.setAttribute("disabled", "");
      } else {
        this._save.removeAttribute("disabled");
      }
    });

    this._recents.addEventListener("recent", evt => {
      this._attributes.setValues({attributes: evt.detail});
    });

    this._save.addEventListener("click", () => {
      this._values = this._attributes.getValues();
      this.saveObject(this._requestObj, this._values)
      if (this._metaMode)
      {
        // Update the meta cache
        this._metaCache = Object.assign({},this._values)
      }
      this._attributes.reset();
    });

    cancel.addEventListener("click", () => {
      this.dispatchEvent(new Event("cancel"));
      this._attributes.reset();
    });
  }

  // Save the underlying object to the database
  saveObject(requestObj, values)
  {
    this.dispatchEvent(new CustomEvent("save", {
      detail: values
    }));
    this._recents.store(this._values);
    const mediaId = this.getAttribute("media-id");
    const body = {
      type: this._dataType.type.id,
      name: this._dataType.type.name,
      media_id: mediaId,
      ...requestObj,
      ...values,
    };

    this._undo.post("Localizations", body, this._dataType);
  }

  set undoBuffer(val) {
    this._undo = val;
  }

  set dataType(val) {
    this._span.textContent = val.type.name;
    this._attributes.dataType = val;
    this._recents.dataType = val;
    this._dataType = val;
    this._attributes.dispatchEvent(new Event("change"));
  }

  set canvasPosition(val) {
    this._canvasPosition = val;
    this._updatePosition();
  }

  set dragInfo(val) {
    this._dragInfo = val;
    this._updatePosition();
  }

  set metaMode(val) {
    this._metaMode = val;
    if (val == false)
    {
      this._metaCache = null;
    }
  }

  get metaMode() {
    return this._metaMode;
  }

  get metaCache() {
    return this._metaCache;
  }

  set requestObj(val) {
    this._requestObj = val;
  }

  addRecent(val) {
    this._recent.add(val);
  }

  _updatePosition() {
    const dragDefined = typeof this._dragInfo !== "undefined";
    const canvasDefined = typeof this._canvasPosition !== "undefined";
    if (dragDefined && canvasDefined) {
      const boxTop = Math.min(this._dragInfo.start.y, this._dragInfo.end.y) - 2;
      const boxRight = Math.max(this._dragInfo.start.x, this._dragInfo.end.x);
      let thisTop = boxTop + this._canvasPosition.top;
      let thisLeft = boxRight + 20 + this._canvasPosition.left;
      if ((thisLeft + this.clientWidth) > window.innerWidth) {
        const boxLeft = Math.min(this._dragInfo.start.x, this._dragInfo.end.x);
        thisLeft = boxLeft - 20 - this.clientWidth + this._canvasPosition.left;
      }
      if ((thisTop + this.clientHeight) > window.innerHeight) {
        const boxBottom = Math.max(this._dragInfo.start.y, this._dragInfo.end.y) + 2;
        thisTop = boxBottom - this.clientHeight + this._canvasPosition.top + 16;
      }
      this.style.top = thisTop + "px";
      this.style.left = thisLeft + "px";
    }
  }
}

customElements.define("save-dialog", SaveDialog);
