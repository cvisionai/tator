class UndoBuffer extends HTMLElement {
  constructor() {
    super();

    this._forwardOps = [];
    this._backwardOps = [];
    this._dataTypes = [];
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
        fetchRetry("/rest/EntityMedia/" + this._media.id, {
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
            .then(data => console.error("Error during fetch: " + JSON.stringify(data)));
          }
        });

        // Launch any edit trigger algorithms
        var edit_triggers=this._mediaType.type.editTriggers;
        if (edit_triggers)
        {
          edit_triggers.forEach(algo_name=>{
            fetchRetry("/rest/AlgorithmLaunch/" + this._media['project'], {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Accept": "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                "algorithm_name": algo_name,
                "media_ids": `${this._media['id']}`,
              }),
            })
          });
        }
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

  post(listUri, body, dataType) {
    const projectId = this.getAttribute("project-id");
    const op = ["POST", listUri, projectId, body];
    const promise = this._fetch(op, dataType);
    if (promise) {
      promise
      .then(response => response.json())
      .then(data => {
        this._emitUpdate("POST", data.id, body, dataType);
        const detailUri = UndoBuffer.listToDetail[listUri];
        this._resetFromNow();
        this._forwardOps.push(op);
        this._backwardOps.push(["DELETE", detailUri, data.id, null]);
        this._dataTypes.push(dataType);
        this._index++;
      });
    }
  }

  patch(detailUri, id, body, dataType) {
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
        this._dataTypes.push(dataType);
        return this.redo();
      });
    } else {
      return null;
    }
  }

  del(detailUri, id, dataType) {
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
        this._dataTypes.push(dataType);
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
      const [method, uri, id, body] = op;
      const dataType = this._dataTypes[this._index];
      const promise = this._fetch(op, dataType)
      if (method == "POST") {
        promise
        .then(response => response.json())
        .then(data => {
          this._emitUpdate(method, data.id, body, dataType);
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
      } else {
        this._emitUpdate(method, id, body, dataType);
      }
    }
  }

  redo() {
    if (this._index < this._forwardOps.length) {
      const op = this._forwardOps[this._index];
      const [method, uri, id, body] = op;
      const dataType = this._dataTypes[this._index];
      const promise = this._fetch(op, dataType);
      if (method == "POST") {
        promise
        .then(response => response.json())
        .then(data => {
          this._emitUpdate(method, data.id, body, dataType);
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
      } else {
        this._emitUpdate(method, id, body, dataType);
      }
      this._index++;
    }
  }

  _get(detailUri, id) {
    const url = "/rest/" + detailUri + "/" + id;
    return fetchRetry(url, {
      method: "GET",
      ...this._headers(),
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        console.error("Error getting current value, got " + response.status);
        return null;
      }
    });
  }

  _fetch(op, dataType) {
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
    return fetchRetry(url, obj)
    .then(response => {
      if (response.ok) {
        console.log("Fetch successful!");
        return response;
      } else {
        console.error("Error during fetch!");
        response.json()
        .then(data => console.error("Error during fetch: " + JSON.stringify(data)));
      }
    });
  }

  _emitUpdate(method, id, body, dataType) {
    this.dispatchEvent(new CustomEvent("update", {
      detail: {
        method: method,
        id: id,
        body: body,
        dataType: dataType,
      }
    }));
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
    if (this._index < this._dataTypes.length) {
      this._forwardOps.splice(this._index);
      this._backwardOps.splice(this._index);
      this._dataTypes.splice(this._index);
    }
  }
}

customElements.define("undo-buffer", UndoBuffer);
