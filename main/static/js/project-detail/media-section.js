class MediaSection extends TatorElement {
  constructor() {
    super();

    const section = document.createElement("div");
    section.setAttribute("class", "project__section py-3");
    this._shadow.appendChild(section);

    const header = document.createElement("div");
    header.setAttribute("class", "project__header d-flex flex-items-center flex-justify-between col-9 row-actions-hover");
    section.appendChild(header);

    this._name = document.createElement("h2");
    this._name.setAttribute("class", "h3"); //not a typo
    header.appendChild(this._name);

    this._nameText = document.createTextNode("");
    this._name.appendChild(this._nameText);

    const numFiles = document.createElement("span");
    numFiles.setAttribute("class", "text-gray px-2");
    this._name.appendChild(numFiles);

    this._numFiles = document.createTextNode("");
    numFiles.appendChild(this._numFiles);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex");
    section.appendChild(div);

    this._files = document.createElement("section-files");
    this._files.setAttribute("class", "col-9");
    this._files.mediaFilter = this._sectionFilter.bind(this);
    div.appendChild(this._files);

    this._overview = document.createElement("section-overview");
    this._overview.setAttribute("class", "col-3");
    this._overview.mediaFilter = this._sectionFilter.bind(this);
    div.appendChild(this._overview);

    this._files.addEventListener("cardMouseover", evt => {
      this._latestMouse = "enter";
      this._overview.updateForMedia(evt.detail.media);
    });

    this._files.addEventListener("cardMouseexit", () => {
      this._latestMouse = "exit";
      new Promise(resolve => setTimeout(() => {
        if (this._latestMouse === "exit") {
          this._overview.updateForAllSoft();
        }
        resolve();
      }, 200));
    });
  }

  static get observedAttributes() {
    return ["project-id", "name", "username", "token"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "project-id":
        this._files.setAttribute("project-id", newValue);
        this._overview.setAttribute("project-id", newValue);
        this._setCallbacks();
        break;
      case "name":
        if (newValue === "null") {
          this._nameText.nodeValue = "Unnamed Section";
          this._sectionName = "Unnamed Section";
        }
        else {
          this._nameText.nodeValue = newValue;
          this._sectionName = newValue;
        }
        this._files.setAttribute("section", this._sectionName);
        this._setCallbacks();
        break;
      case "username":
        this._files.setAttribute("username", newValue);
        break;
      case "token":
        this._files.setAttribute("token", newValue);
        break;
    }
  }

  set permission(val) {
    this._files.permission = val;
  }

  get overview() {
    return this._overview;
  }

  set numMedia(val) {
    this._updateNumFiles(val);
    if (val == 0) {
      this._overview.style.display = "none";
      this._files.style.display = "none";
    } else {
      this._overview.style.display = "block";
      this._files.style.display = "block";
      if (val != this._files.numMedia) {
        this._files.numMedia = val;
      }
    }
  }

  set sectionFilter(val) {
    this._attributeFilter = val;
    this._overview.updateForAll();
  }

  get sectionFilter() {
    return this._sectionFilter();
  }

  set worker(val) {
    this._worker = val;
    this._files.worker = val;
  }

  set cardInfo(val) {
    this._files.cardInfo = val;
  }

  set mediaIds(val) {
    this._updateNumFiles(val.length);
    this._files.mediaIds = val;
  }

  set algorithms(val) {
    this._files.algorithms = val;
  }

  set sections(val) {
    let sections = val.slice();
    const index = sections.indexOf(this._sectionName);
    if (index > -1) {
      sections.splice(index, 1);
    }
    this._files.sections = sections;
  }

  _updateNumFiles(numFiles) {
    let fileText = " Files";
    if (numFiles == 1) {
      fileText = " File";
    }
    this._numFiles.nodeValue = numFiles + fileText;
  }

  _sectionFilter() {
    return this._attributeFilter;
  }

  _setCallbacks() {
    const projectDefined = this.getAttribute("project-id") !== null;
    const nameDefined = this.getAttribute("name") !== null;
    if (projectDefined && nameDefined) {
      this._files.addEventListener("algorithm", evt => {
        const projectId = this.getAttribute("project-id");
        fetch("/rest/AlgorithmLaunch/" + projectId, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "algorithm_name": evt.detail.algorithmName,
            "media_query": this._sectionFilter(),
          }),
        })
        .then(response => {
          const page = document.querySelector("project-detail");
          if (response.status == 201) {
            page._progress.notify("Algorithm launched!", true);
          } else {
            page._progress.error("Error launching algorithm!");
          }
          return response.json();
        })
        .then(data => console.log(data));
      });

      this._files.addEventListener("download", evt => {
        const projectId = this.getAttribute("project-id");
        let mediaFilter = "";
        if (evt.detail.mediaIds) {
          mediaFilter = "&media_id=" + evt.detail.mediaIds;
        }
        fetch("/rest/EntityMedias/" + projectId + this._sectionFilter() + mediaFilter, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
        })
        .then(response => response.json())
        .then(medias => {
          let fileIndex = 0;
          let numQueued = 0;
          const filenames = new Set();
          const re = /(?:\.([^.]+))?$/;
          const headers = {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json"
          };
          const fileStream = streamSaver.createWriteStream(this._sectionName + ".zip");
          const readableZipStream = new ZIP({
            async pull(ctrl) {
              if (fileIndex < medias.length) {
                const media = medias[fileIndex];
                const basenameOrig = media.name.replace(/\.[^/.]+$/, "");
                const ext = re.exec(media.name)[0];
                let basename = basenameOrig;
                let vers = 1;
                while (filenames.has(basename)) {
                  basename = basenameOrig + " (" + vers + ")";
                  vers++;
                }
                filenames.add(basename);
                if (evt.detail.annotations) {
                  console.log("Downloading metadata for " + media.name + "...");

                  // Download media metadata
                  const p0 = fetch("/rest/EntityMedia/" + media.id, {
                    method: "GET",
                    credentials: "same-origin",
                    headers: headers,
                  })
                  .then(response => {
                    const stream = () => response.body;
                    const name = basename + "__media.json";
                    ctrl.enqueue({name, stream});
                  });

                  // Download localizations
                  const p1 = fetch("/rest/LocalizationTypes/" + projectId + "?media_id=" + media.id, {
                    method: "GET",
                    credentials: "same-origin",
                    headers: headers,
                  })
                  .then(response => {
                    const clone = response.clone();
                    const stream = () => response.body;
                    const name = basename + "__localization_types.json";
                    ctrl.enqueue({name, stream});
                    return clone.json();
                  })
                  .then(locTypes => {
                    const promises = [];
                    for (const locType of locTypes) {
                      const typeId = locType.type.id;
                      const locName = locType.type.name.toLowerCase();
                      const params = "?media_id=" + media.id + "&type=" + typeId;
                      promises.push(fetch("/rest/Localizations/" + projectId + params, {
                        method: "GET",
                        credentials: "same-origin",
                        headers: headers,
                      })
                      .then(response => {
                        const stream = () => response.body;
                        const name = basename + "__localizations__" + locName + ".json";
                        ctrl.enqueue({name, stream});
                      }));
                      promises.push(fetch("/rest/Localizations/" + projectId + params + "&format=csv", {
                        method: "GET",
                        credentials: "same-origin",
                        headers: headers,
                      })
                      .then(response => {
                        const stream = () => response.body;
                        const name = basename + "__localizations__" + locName + ".csv";
                        ctrl.enqueue({name, stream});
                      }));
                    }
                    return Promise.all(promises);
                  });

                  // Download states
                  const p2 = fetch("/rest/EntityStateTypes/" + projectId + "?media_id=" + media.id, {
                    method: "GET",
                    credentials: "same-origin",
                    headers: headers,
                  })
                  .then(response => {
                    const clone = response.clone();
                    const stream = () => response.body;
                    const name = basename + "__state_types.json";
                    ctrl.enqueue({name, stream});
                    return clone.json();
                  })
                  .then(stateTypes => {
                    const promises = [];
                    for (const stateType of stateTypes) {
                      const typeId = stateType.type.id;
                      const stateName = stateType.type.name.toLowerCase();
                      const assoc = stateType.type.association;
                      let entityName;
                      if (assoc == "Localization") {
                        entityName = "tracks";
                      } else if (assoc == "Media") {
                        entityName = "media";
                      } else if (assoc == "Frame") {
                        entityName = "events";
                      }
                      const params = "?media_id=" + media.id + "&type=" + typeId;
                      promises.push(fetch("/rest/EntityStates/" + projectId + params, {
                        method: "GET",
                        credentials: "same-origin",
                        headers: headers,
                      })
                      .then(response => {
                        const stream = () => response.body;
                        const name = basename + "__" + entityName + "__" + stateName + ".json";
                        ctrl.enqueue({name, stream});
                      }));
                      promises.push(fetch("/rest/EntityStates/" + projectId + params + "&format=csv", {
                        method: "GET",
                        credentials: "same-origin",
                        headers: headers,
                      })
                      .then(response => {
                        const stream = () => response.body;
                        const name = basename + "__" + entityName + "__" + stateName + ".csv";
                        ctrl.enqueue({name, stream});
                      }));
                    }
                    return Promise.all(promises);
                  });

                  // Add to number of queued.
                  await Promise.all([p0, p1, p2])
                  .then(() => {
                    numQueued++;
                    if (numQueued >= medias.length) {
                      ctrl.close();
                    }
                  });

                } else {

                  let request = Utilities.getDownloadRequest(media, headers);

                  // Download media file.
                  console.log("Downloading " + media.name + " from " + request.url + "...");
                  await fetch(request)
                  .then(response => {
                    const stream = () => response.body;
                    const name = basename + ext;
                    ctrl.enqueue({name, stream});
                    numQueued++;
                    if (numQueued >= medias.length) {
                      ctrl.close();
                    }
                  });
                }
                fileIndex++;
              }
            }
          });
          if (window.WritableStream && readableZipStream.pipeTo) {
            readableZipStream.pipeTo(fileStream);
          } else {
            const writer = fileStream.getWriter();
            const reader = readableZipStream.getReader();
            const pump = () => reader.read()
              .then(res => res.done ? writer.close() : writer.write(res.value).then(pump));
            pump();
          }
        })
      });

      this._files.addEventListener("rename", evt => {
        if (this._name.contains(this._nameText)) {
          const input = document.createElement("input");
          input.setAttribute("class", "form-control input-sm f1");
          input.setAttribute("value", this._sectionName);
          this._name.replaceChild(input, this._nameText);
          input.addEventListener("focus", evt => {
            evt.target.select();
          });
          input.addEventListener("keydown", evt => {
            if (evt.keyCode == 13) {
              evt.preventDefault();
              input.blur();
            }
          });
          input.addEventListener("blur", evt => {
            if (evt.target.value !== "") {
              this._worker.postMessage({
                command: "renameSection",
                fromName: this._sectionName,
                toName: evt.target.value,
              });
              this._sectionName = evt.target.value;
            }
            const projectId = this.getAttribute("project-id");
            fetch("/rest/EntityMedias/" + projectId + this._sectionFilter(), {
              method: "PATCH",
              credentials: "same-origin",
              headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Accept": "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                "attributes": {"tator_user_sections": this._sectionName}
              }),
            });
            this.setAttribute("name", this._sectionName);
            this._files.setAttribute("section", this._sectionName);
            this._name.replaceChild(this._nameText, evt.target);
            this.dispatchEvent(new Event("newName"));
          });
          input.focus();
        }
      });

      this._files.addEventListener("delete", evt => {
        this.dispatchEvent(new CustomEvent("remove", {
          detail: {
            sectionFilter: this._sectionFilter(),
            sectionName: this._sectionName,
            projectId: this.getAttribute("project-id")
          }
        }));
      });
    }
  }
}

customElements.define("media-section", MediaSection);
