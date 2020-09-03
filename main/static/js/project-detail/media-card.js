class MediaCard extends TatorElement {
  constructor() {
    super();

    this._li = document.createElement("li");
    this._li.setAttribute("class", "file d-flex flex-items-center flex-justify-between py-2 rounded-2");
    this._shadow.appendChild(this._li);

    this._link = document.createElement("a");
    this._link.setAttribute("class", "file__link d-flex flex-items-center text-white");
    this._link.setAttribute("href", "#");
    this._li.appendChild(this._link);

    this._img = document.createElement("img");
    this._img.setAttribute("src", "/static/images/spinner-transparent.svg");
    this._img.setAttribute("class", "file__image px-2 rounded-1");
    this._link.appendChild(this._img);

    const div = document.createElement("div");
    div.setAttribute("class", "file__text px-1");
    this._link.appendChild(div);

    const h3 = document.createElement("h3");
    h3.setAttribute("class", "file__name py-1 css-truncate");
    div.appendChild(h3);

    this._name = document.createElement("span");
    h3.appendChild(this._name);

    this._ext = document.createElement("span");
    this._ext.setAttribute("class", "text-gray");
    h3.appendChild(this._ext);

    this._description = document.createElement("media-description");
    div.appendChild(this._description);

    this._more = document.createElement("media-more");
    this._more.setAttribute("class", "px-3");
    this._li.appendChild(this._more);

    this._more.addEventListener("algorithmMenu", evt => {
      this.dispatchEvent(new CustomEvent("algorithm", {
        detail: {
          mediaIds: [Number(this.getAttribute("media-id"))],
          algorithmName: evt.detail.algorithmName
        },
        composed: true
      }));
    });

    this._more.addEventListener("moveToNew", evt => {
      this.dispatchEvent(new CustomEvent("moveFileToNew", {
        detail: {mediaId: this.getAttribute("media-id")},
        composed: true
      }));
    });

    this._more.addEventListener("move", evt => {
      this.dispatchEvent(new CustomEvent("moveFile", {
        detail: {
          to: evt.detail.to,
          mediaId: this.getAttribute("media-id"),
        },
        composed: true
      }));
    });

    this._more.addEventListener("annotations", evt => {
      this.dispatchEvent(new CustomEvent("download", {
        detail: {
          mediaIds: this.getAttribute("media-id"),
          annotations: true
        },
        composed: true
      }));
    });

    this._more.addEventListener("rename", evt => {
      const input = document.createElement("input");
      input.setAttribute("class", "form-control input-sm1 f1");
      input.setAttribute("value", this._name.textContent);
      h3.replaceChild(input, this._name);
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
          this._name.textContent = evt.target.value;
          const full = evt.target.value + this._ext.textContent;
          this._li.setAttribute("title", full);
        }
        fetch("/rest/Media/" + this.getAttribute("media-id"), {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: this._name.textContent + this._ext.textContent,
          }),
        })
        .catch(err => console.error("Failed to change name: " + err));
        h3.replaceChild(this._name, evt.target);
      });
      input.focus();
    });

    this._more.addEventListener("delete", evt => {
      this.dispatchEvent(new CustomEvent("deleteFile", {
        detail: {
          mediaId: this.getAttribute("media-id"),
          mediaName: this._name.textContent
        },
        composed: true
      }));
    });

    this._more.addEventListener("cancel", evt => {
      this._description._label.textContent = "Cancelling...";
      const processId = this.getAttribute("process-id");
      this.dispatchEvent(new CustomEvent("cancelUpload", {
        detail: {uid: processId},
        composed: true
      }));
      fetch("/rest/Job/" + processId, {
        method:"DELETE",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      })
      .then(response => response.json())
      .then(data => console.log(data));
    });
  }

  static get observedAttributes() {
    return ["thumb", "thumb-gif", "name", "processing"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "thumb":
        if (this._thumb != newValue) {
          this._img.setAttribute("src", newValue);
          this._img.onload = () => {this.dispatchEvent(new Event("loaded"))};
          this._thumb = newValue;
        }
        break;
      case "thumb-gif":
        if (this._thumbGif != newValue) {
          this._thumbGif = newValue;
          this._li.addEventListener("mouseenter", () => {
            if (this.hasAttribute("thumb-gif")) {
              this._img.setAttribute("src", this.getAttribute("thumb-gif"));
            }
          });
          this._li.addEventListener("mouseleave", () => {
            if (this.hasAttribute("thumb")) {
              this._img.setAttribute("src", this.getAttribute("thumb"));
            }
          });
        }
        break;
      case "name":
        const dot = Math.max(0, newValue.lastIndexOf(".") || Infinity);
        const ext = newValue.slice(dot + 1);
        this._ext.textContent = "." + ext;
        this._name.textContent = newValue.slice(0, dot);
        this._li.setAttribute("title", newValue);
        this._description.setAttribute("extension", ext.toUpperCase());
        this._more.setAttribute("name", newValue);
        break;
      case "processing":
        if (newValue === null) {
          this._more.removeAttribute("processing");
        } else {
          this._more.setAttribute("processing", "");
        }
        break;
    }
  }

  set permission(val) {
    if (!hasPermission(val, "Can Edit")) {
      this._more.style.display = "none";
    }
    this._more.permission = val;
  }

  set algorithms(val) {
    this._more.algorithms = val;
  }

  set sections(val) {
    this._more.sections = val;
  }

  set mediaFilter(val) {
    this._mediaFilter = val;
  }

  set media(val) {
    this._media = val;
    if (this._media.file == '' &&
        (this._media.media_files && !('streaming' in this._media.media_files)))
    {
      this._li.style.opacity = 0.35;
      this._li.style.cursor = "not-allowed";
      this._link.style.cursor = "not-allowed";
    }
    else
    {
      this._more.media = val;
      let project = val.project;
      if(typeof(val.project) == "undefined") {
        project = val.project_id;
      }
      var uri = encodeURI(`/${project}/annotation/${val.id}${this._mediaFilter()}`);
      this._link.setAttribute("href", uri);
    }
  }

  get media() {
    return this._media;
  }

  updateProgress(state, percent, msg) {
    if (state == "failed") {
      this.removeAttribute("thumb-gif");
      this.setAttribute("thumb", "/static/images/alert-circle.svg");
    }
    this._description.setProgress(state, percent, msg);
  }
}

customElements.define("media-card", MediaCard);
