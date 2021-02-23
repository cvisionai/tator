class MediaCard extends EntityCard {
  constructor() {
    super();

    // Media Card
    // Include More Menu
    this._more.hidden = false;

    // Handle Clicks of More Menu Items
    // Algorithm button - Requires:
    // - @media-id
    // - @evt.detail.algorithmName
    // - @this._more._project.id
    this._more.addEventListener("algorithmMenu", evt => {
      this.dispatchEvent(
        new CustomEvent("runAlgorithm",
          {composed: true,
          detail: {
            algorithmName: evt.detail.algorithmName,
            mediaIds: [Number(this.getAttribute("media-id"))],
            projectId: this._more._project.id,
          }}));
    });

    // Download annoatations click.
    this._more.addEventListener("annotations", evt => {
      this.dispatchEvent(new CustomEvent("downloadAnnotations", {
        detail: {
          mediaIds: this.getAttribute("media-id"),
          annotations: true
        },
        composed: true
      }));
    });

    // Rename click.
    this._more.addEventListener("rename", evt => {
      const input = document.createElement("input");
      input.setAttribute("class", "form-control input-sm1 f1");
      input.setAttribute("value", this._name.textContent);
      this.titleDiv.replaceChild(input, this._name);
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
            name: `${this._name.textContent}.${this._ext.textContent}`,
          }),
        })
        .catch(err => console.error("Failed to change name: " + err));
        this.titleDiv.replaceChild(this._name, evt.target);
      });
      input.focus();
    });

    // Delete click.
    this._more.addEventListener("delete", evt => {
      this.dispatchEvent(new CustomEvent("deleteFile", {
        detail: {
          mediaId: this.getAttribute("media-id"),
          mediaName: this._name.textContent
        },
        composed: true
      }));
    });
  }

  // Related to "more" menu
  set project(val) {
    if (!hasPermission(val.permission, "Can Edit")) {
      this._more.style.display = "none";
    }
    this._more.project = val;
  }
  
  set algorithms(val) {
    this._more.algorithms = val;
  }

  set mediaParams(val) {
    this._mediaParams = val;
  }

  set media(val) {
    this._media = val;
    this._more.media = val;
    let valid = false;
    if (this._media.media_files)
    {
      if ('streaming' in this._media.media_files ||
          'layout' in this._media.media_files ||
          'image' in this._media.media_files)
      {
        valid = true;
      }
    }
    if (valid == false)
    {
      this._name.style.opacity = 0.35;
      this._link.style.opacity = 0.35;
      this._name.style.cursor = "not-allowed";
      this._link.style.cursor = "not-allowed";
    }
    else
    {
      let project = val.project;
      if(typeof(val.project) == "undefined") {
        project = val.project_id;
      }
      var uri = `/${project}/annotation/${val.id}?${this._mediaParams.toString()}`;
      this._name.setAttribute("href", uri);
      this._link.setAttribute("href", uri);
      this._name.style.opacity = 1;
      this._link.style.opacity = 1;
      this._name.style.cursor = "pointer";
      this._link.style.cursor = "pointer";
    }
  }

  get media() {
    return this._media;
  }

}

customElements.define("media-card", MediaCard);
