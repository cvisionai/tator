class UndoBuffer extends HTMLElement {
  constructor() {
    super();

    this._forwardOps = [];
    this._backwardOps = [];
    this._events = [];
    this._index = 0;
    this._editsMade = false;
    this._sessionStart = new Date();

    document.addEventListener("keydown", evt => {
      if (evt.isComposing || evt.keyCode === 229) {
        return;
      }
      if (evt.ctrlKey && evt.key == "z") {
        evt.preventDefault();
        this.undo();
      }
      if (evt.ctrlKey && evt.key == "y") {
        evt.preventDefault();
        this.redo();
      }
    })

    window.addEventListener("beforeunload", () => {
      if (this._editsMade) {
        const sessionEnd = new Date();
        fetch("/rest/EntityMedia/" + this._media.id, {
          method: "PATCH",
          body: JSON.stringify({
            last_edit_start: this._sessionStart.toISOString(),
            last_edit_end: sessionEnd.toISOString(),
            resourcetype: this._media.resourcetype,
          }),
          ...this._headers(),
        })
        .then(response => {
          if (response.ok) {
            return response;
          } else {
            response.json()
            .then(data => console.log("Error during fetch: " + JSON.stringify(data)));
          }
        });

        // Launch any edit trigger algorithms
        var edit_triggers=this._media.editTriggers;
      }
    });
  }

  static get detailToList() {
    return {
      "Localization": "Localizations",
      "EntityState": "EntityStates",
    };
  }

  static get listToDetail() {
    return {
      "Localizations": "Localization",
      "EntityStates": "EntityState",
    };
  }

  set mediaInfo(val) {
    this._media = val;
  }

  set mediaType(val) {
    this._mediaType = val;
  }

  post(listUri, body, evt) {
    const projectId = this.getAttribute("project-id");
    const op = ["POST", listUri, projectId, body];
    const promise = this._fetch(op, evt);
    if (promise) {
      promise
      .then(response => response.json())
      .then(data => {
        const detailUri = UndoBuffer.listToDetail[listUri];
        this._resetFromNow();
        this._forwardOps.push(op);
        this._backwardOps.push(["DELETE", detailUri, data.id, null]);
        this._events.push(evt);
        this._index++;
      });
    }
  }

  patch(detailUri, id, body, evt) {
    const promise = this._get(detailUri, id);
    if (promise) {
      return promise.then(data => {
        const original = {};
        for (const key in body) {
          if (key in data) {
            original[key] = data[key];
          }
        }
        if ("attributes" in data) {
          original.attributes = {};
          for (const key in data.attributes) {
            original.attributes[key] = data.attributes[key];
          }
        }
        this._resetFromNow();
        this._forwardOps.push(["PATCH", detailUri, id, body]);
        this._backwardOps.push(["PATCH", detailUri, id, original]);
        this._events.push(evt);
        return this.redo();
      });
    } else {
      return null;
    }
  }

  del(detailUri, id, evt) {
    const promise = this._get(detailUri, id);
    if (promise) {
      return promise.then(data => {
        let other;
        if (detailUri == "Localization") {
          other = {
            media_id: data.media,
            frame: data.frame,
          };
        } else {
          other = {
            media_ids: data.association.media[0],
            frame: data.association.frame,
            type: data.meta,
          };
        }
        const body = {
          type: data.meta.id,
          name: data.meta.name,
          ...other,
          ...data,
          ...data.attributes,
        }
        const projectId = this.getAttribute("project-id");
        const listUri = UndoBuffer.detailToList[detailUri];
        this._resetFromNow();
        this._forwardOps.push(["DELETE", detailUri, id, null]);
        this._backwardOps.push(["POST", listUri, projectId, body]); 
        this._events.push(evt);
        return this.redo();
      });
    } else {
      return null;
    }
  }

  undo() {
    if (this._index > 0) {
      this._index--;
      const op = this._backwardOps[this._index];
      const evt = this._events[this._index];
      const promise = this._fetch(op, evt);
      if (op[0] == "POST") {
        promise
        .then(response => response.json())
        .then(data => {
          const delId = this._forwardOps[this._index][2];
          const newId = data.id;
          const replace = op => {
            if (op[2] == delId) {
              op[2] = newId;
            }
          };
          this._forwardOps.forEach(replace);
          this._backwardOps.forEach(replace);
        });
      }
    }
  }

  redo() {
    if (this._index < this._forwardOps.length) {
      const op = this._forwardOps[this._index];
      const evt = this._events[this._index];
      const promise = this._fetch(op, evt);
      if (op[0] == "POST") {
        promise
        .then(response => response.json())
        .then(data => {
          const delId = this._backwardOps[this._index - 1][2];
          const newId = data.id;
          const replace = op => {
            if (op[2] == delId) {
              op[2] = newId;
            }
          };
          this._forwardOps.forEach(replace);
          this._backwardOps.forEach(replace);
        });
      }
      this._index++;
    }
  }

  _get(detailUri, id) {
    return this._fetch(["GET", detailUri, id, null])
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        console.log("Error getting current value, got " + response.status);
        return null;
      }
    });
  }

  _fetch(op, evt) {
    this._editsMade = true;
    const [method, uri, id, body] = op;
    const url = "/rest/" + uri + "/" + id;
    const obj = {
      method: method,
      ...this._headers(),
    };
    if (body) {
      obj.body = JSON.stringify(body);
    }
    const promise = fetch(url, obj)
    .then(response => {
      if (response.ok) {
        return response;
      } else {
        response.json()
        .then(data => console.log("Error during fetch: " + JSON.stringify(data)));
      }
    });
    if (evt) {
      return promise.then(this.dispatchEvent(evt));
    } else {
      return promise;
    }
  }

  _headers() {
    return {
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    };
  }

  _resetFromNow() {
    if (this._index < this._events.length) {
      this._forwardOps.splice(this._index);
      this._backwardOps.splice(this._index);
      this._events.splice(this._index);
    }
  }
}

customElements.define("undo-buffer", UndoBuffer);
