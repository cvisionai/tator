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
        fetchRetry("/rest/Media/" + this._media.id, {
          method: "PATCH",
          body: JSON.stringify({
            last_edit_start: this._sessionStart.toISOString(),
            last_edit_end: sessionEnd.toISOString(),
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
        var edit_triggers=this._mediaType.editTriggers;
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
                "media_ids": [this._media['id']],
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
      "State": "States",
    };
  }

  static get listToDetail() {
    return {
      "Localizations": "Localization",
      "States": "State",
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
    const detailUri = UndoBuffer.listToDetail[listUri];
    this._resetFromNow();
    this._forwardOps.push([["POST", listUri, projectId, body]]);
    this._backwardOps.push([["DELETE", detailUri, null, null]]);
    this._dataTypes.push(dataType);
    return this.redo();
  }

  patch(detailUri, id, body, dataType) {
    const projectId = this.getAttribute("project-id");
    const promise = this._get(detailUri, id, dataType.id);
    if (promise) {
      return promise.then(data => {
        let other;
        if (detailUri == "Localization") {
          other = {
            media_id: data.media,
            frame: data.frame,
            type: data.meta,
          };
          if (data.u === null) {
            delete data.u;
          }
          if (data.v === null) {
            delete data.v;
          }
          if (data.width === null) {
            delete data.width;
          }
          if (data.height === null) {
            delete data.height;
          }
        } else if (detailUri == "State") {
          other = {
            media_ids: data.media,
            frame: data.frame,
            type: data.meta,
            localization_ids: data.localizations,
          };
        }
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
        if ((data.modified == null) && (detailUri != "Media")) {
          // This was an original annotation, patch the original and post
          // an edited one.
          const listUri = UndoBuffer.detailToList[detailUri];
          this._forwardOps.push([
            ["POST", listUri, projectId, {
              ...data, ...data.attributes, ...original, ...other, modified: false,
            }],
            ["PATCH", detailUri, id, {...body, modified: true}],
          ]);
          this._backwardOps.push([
            ["PATCH", detailUri, id, {...original, modified: null}],
            ["DELETE", detailUri, null, null],
          ]);
          this._dataTypes.push(dataType);
        } else {
          this._forwardOps.push([["PATCH", detailUri, id, body]]);
          this._backwardOps.push([["PATCH", detailUri, id, original]]);
          this._dataTypes.push(dataType);
        }
        return this.redo();
      });
    } else {
      return null;
    }
  }

  del(detailUri, id, dataType) {
    const promise = this._get(detailUri, id, dataType.id);
    if (promise) {
      return promise.then(data => {
        let body;
        if (['box', 'line', 'dot'].includes(dataType.dtype)) {
          body = {
            media_id: data.media,
            frame: data.frame,
            type: dataType.id,
            version: data.version,
            x: data.x,
            y: data.y,
            ...data.attributes,
          };
          if (dataType.dtype == 'box') {
            body = {
              ...body,
              width: data.width,
              height: data.height,
            };
          } else if (dataType.dtype == 'line') {
            body = {
              ...body,
              u: data.u,
              v: data.v,
            };
          }
        } else if (dataType.dtype == 'state') {
          body = {
            media_ids: data.media,
            localization_ids: data.localizations,
            frame: data.frame,
            type: dataType.id,
            version: data.version,
            ...data.attributes,
          };
        }

        const projectId = this.getAttribute("project-id");
        const listUri = UndoBuffer.detailToList[detailUri];
        this._resetFromNow();
        if (data.modified == null) {
          // This was an "original" annotation, patch the original.
          this._forwardOps.push([["PATCH", detailUri, id, {...body, modified: false}]]);
          this._backwardOps.push([["PATCH", detailUri, id, {...body, modified: null}]]);
        } else if (data.modified == true) {
          // This was an annotation created via web interface, actually delete it.
          this._forwardOps.push([["DELETE", detailUri, id, null]]);
          this._backwardOps.push([["POST", listUri, projectId, {...body, modified: true}]]); 
        } else if (data.modified == false) {
          console.error("Attempted to delete an original version!");
          return null;
        }
        this._dataTypes.push(dataType);
        return this.redo();
      });
    } else {
      return null;
    }
  }

  undo() {
    return; // Undo temporarily disabled.
    if (this._index > 0) {
      this._index--;
      for (const [opIndex, op] of this._backwardOps[this._index].entries()) {
        const [method, uri, id, body] = op;
        const dataType = this._dataTypes[this._index];
        const promise = this._fetch(op, dataType)
        if (method == "POST") {
          promise
          .then(response => response.json())
          .then(data => {
            this._emitUpdate(method, data.id[0], body, dataType);
            const delId = this._forwardOps[this._index][opIndex][2];
            const newId = data.id[0];
            const replace = ops => {
              for (const [opIndex, op] of ops.entries()) {
                if (op[2] == delId || op[2] == null) {
                  ops[opIndex][2] = newId;
                }
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
  }

  redo() {
    if (this._index < this._forwardOps.length) {
      for (const [opIndex, op] of this._forwardOps[this._index].entries()) {
        const [method, uri, id, body] = op;
        const dataType = this._dataTypes[this._index];
        const promise = this._fetch(op, dataType);
        if (method == "POST") {
          promise
          .then(response => response.json())
          .then(data => {
            this._emitUpdate(method, data.id[0], body, dataType);
            const delId = this._backwardOps[this._index - 1][opIndex][2];
            const newId = data.id[0];
            const replace = ops => {
              for (const [opIndex, op] of ops.entries()) {
                if (op[2] == delId || op[2] == null) {
                  ops[opIndex][2] = newId;
                }
              }
            };
            this._forwardOps.forEach(replace);
            this._backwardOps.forEach(replace);
          });
        } else {
          this._emitUpdate(method, id, body, dataType);
        }
      }
      this._index++;
    }
  }

  _get(detailUri, id, typeId) {
    const url = "/rest/" + detailUri + "/" + id + "?type=" + typeId;
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
      if (method == "POST") {
        obj.body = JSON.stringify([body]);
      } else {
        obj.body = JSON.stringify(body);
      }
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
