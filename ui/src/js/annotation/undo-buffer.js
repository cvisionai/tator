import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { Utilities } from "../util/utilities.js";

export class UndoBuffer extends HTMLElement {
  constructor() {
    super();

    this._forwardOps = [];
    this._backwardOps = [];
    this._dataTypes = [];
    this._index = 0;
    this._editsMade = false;
    this._sessionStart = new Date();

    document.addEventListener("keydown", (evt) => {
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
    });

    window.addEventListener("beforeunload", () => {
      if (this._editsMade) {
        const sessionEnd = new Date();
        fetchCredentials(
          "/rest/Media/" + this._media.id,
          {
            method: "PATCH",
            body: JSON.stringify({
              last_edit_start: this._sessionStart.toISOString(),
              last_edit_end: sessionEnd.toISOString(),
            }),
          },
          true
        ).then((response) => {
          if (response.ok) {
            return response;
          } else {
            response
              .json()
              .then((data) =>
                console.error("Error during fetch: " + JSON.stringify(data))
              );
          }
        });

        // Launch any edit trigger algorithms
        var edit_triggers = this._mediaType.editTriggers;
        if (edit_triggers) {
          edit_triggers.forEach((algo_name) => {
            fetchCredentials(
              "/rest/Jobs/" + this._media["project"],
              {
                method: "POST",
                body: JSON.stringify({
                  algorithm_name: algo_name,
                  media_ids: [this._media["id"]],
                }),
              },
              true
            );
          });
        }
      }
    });
  }

  static get detailToList() {
    return {
      Localization: "Localizations",
      State: "States",
    };
  }

  static get listToDetail() {
    return {
      Localizations: "Localization",
      States: "State",
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
    const promise = this._get(detailUri, id);
    if (promise) {
      return promise
        .then((data) => {
          let other;
          if (detailUri == "Localization") {
            other = {
              media_id: data.media,
              frame: data.frame,
              type: data.type,
            };
          } else if (detailUri == "State") {
            other = {
              media_ids: data.media,
              frame: data.frame,
              type: data.type,
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
          this._forwardOps.push([["PATCH", detailUri, id, body]]);
          this._backwardOps.push([["PATCH", detailUri, id, original]]);
          this._dataTypes.push(dataType);
          return this.redo();
        })
        .catch(() => {
          const msg = dataType.name + " was not updated";
          Utilities.warningAlert(msg, "#ff3e1d", false);
          console.error("Error during patch!");
        });
    } else {
      return null;
    }
  }

  del(detailUri, id, dataType) {
    const promise = this._get(detailUri, id);
    if (promise) {
      return promise
        .then((data) => {
          let body;
          if (["box", "line", "dot"].includes(dataType.dtype)) {
            body = {
              media_id: data.media,
              frame: data.frame,
              type: Number(dataType.id.split("_")[1]),
              version: data.version,
              x: data.x,
              y: data.y,
              ...data.attributes,
            };
            if (dataType.dtype == "box") {
              body = {
                ...body,
                width: data.width,
                height: data.height,
              };
            } else if (dataType.dtype == "line") {
              body = {
                ...body,
                u: data.u,
                v: data.v,
              };
            }
          } else if (dataType.dtype == "state") {
            body = {
              media_ids: data.media,
              localization_ids: data.localizations,
              frame: data.frame,
              type: Number(dataType.id.split("_")[1]),
              version: data.version,
              ...data.attributes,
            };
          }

          const projectId = this.getAttribute("project-id");
          const listUri = UndoBuffer.detailToList[detailUri];
          this._resetFromNow();
          this._forwardOps.push([["DELETE", detailUri, id, null]]);
          this._backwardOps.push([["POST", listUri, projectId, body]]);
          this._dataTypes.push(dataType);
          return this.redo();
        })
        .catch(() => {
          const msg = dataType.name + " was not deleted";
          Utilities.warningAlert(msg, "#ff3e1d", false);
          console.error("Error during delete!");
        });
    } else {
      return null;
    }
  }

  undo() {
    if (this._index > 0) {
      this._index--;
      for (const [opIndex, op] of this._backwardOps[this._index].entries()) {
        const [method, uri, id, body] = op;
        const dataType = this._dataTypes[this._index];
        const promise = this._fetch(op, dataType);
        if (method == "POST") {
          promise
            .then((response) => response.json())
            .then((data) => {
              this._emitUpdate(method, data.id[0], body, dataType);
              const delId = this._forwardOps[this._index][opIndex][2];
              const newId = data.id[0];
              const replace = (ops) => {
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
    var promises = [];

    let p = new Promise((resolve) => {
      if (this._index < this._forwardOps.length) {
        for (const [opIndex, op] of this._forwardOps[this._index].entries()) {
          const [method, uri, id, body] = op;
          const dataType = this._dataTypes[this._index];
          let promise = this._fetch(op, dataType);
          if (method == "POST") {
            promise = promise
              .then((response) => response.json())
              .then((data) => {
                this._emitUpdate(method, data.id[0], body, dataType);
                const delId = this._backwardOps[this._index - 1][opIndex][2];
                const newId = data.id[0];
                const replace = (ops) => {
                  for (const [opIndex, op] of ops.entries()) {
                    if (op[2] == delId || op[2] == null) {
                      ops[opIndex][2] = newId;
                    }
                  }
                };
                this._forwardOps.forEach(replace);
                this._backwardOps.forEach(replace);
                return data;
              });
          } else {
            this._emitUpdate(method, id, body, dataType);
          }
          promises.push(promise);
        }
        this._index++;
      }

      // Resolve only after all the fetches have been completed
      Promise.all(promises).then((data) => {
        resolve(data);
      });
    });

    return p;
  }

  _get(detailUri, id) {
    const url = "/rest/" + detailUri + "/" + id;
    return fetchCredentials(url, {}, true).then((response) => {
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
    };
    if (body) {
      if (method == "POST") {
        delete body.color;
        obj.body = JSON.stringify([body]);
      } else {
        obj.body = JSON.stringify(body);
      }
    }
    this.dispatchEvent(
      new CustomEvent("temporarilyMaskEdits", {
        composed: true,
        detail: { enabled: true },
      })
    );

    function errorMsg() {
      var msg = "";
      if (method == "PATCH") {
        msg = " was not updated";
      } else if (method == "POST") {
        msg = " was not created";
      } else if (method == "DELETE") {
        msg = " was not deleted";
      }
      msg = dataType.name + msg;
      Utilities.warningAlert(msg, "#ff3e1d", false);
      console.error("Error during fetch!");
    }

    return fetchCredentials(url, obj, true)
      .then((response) => {
        if (response.ok) {
          console.log("Fetch successful!");
          return response;
        } else {
          errorMsg();
          response
            .json()
            .then((data) =>
              console.error("Error during fetch: " + JSON.stringify(data))
            );
        }
      })
      .catch(() => {
        errorMsg();
      });
  }

  _emitUpdate(method, id, body, dataType) {
    var msg = "";
    if (method == "PATCH") {
      msg = " updated!";
    } else if (method == "POST") {
      msg = " created!";
    } else if (method == "DELETE") {
      msg = " deleted!";
    }
    msg = dataType.name + msg;
    Utilities.showSuccessIcon(msg);

    this.dispatchEvent(
      new CustomEvent("update", {
        detail: {
          method: method,
          id: id,
          body: body,
          dataType: dataType,
        },
      })
    );
    this.dispatchEvent(
      new CustomEvent("temporarilyMaskEdits", {
        composed: true,
        detail: { enabled: false },
      })
    );
  }

  _resetFromNow() {
    if (this._index < this._dataTypes.length) {
      this._forwardOps.splice(this._index);
      this._backwardOps.splice(this._index);
      this._dataTypes.splice(this._index);
    }
  }
}

if (!customElements.get("undo-buffer")) {
  customElements.define("undo-buffer", UndoBuffer);
}
