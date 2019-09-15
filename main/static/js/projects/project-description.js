class ProjectDescription extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "projects__description d-flex py-2 f2 text-gray");
    this._shadow.appendChild(div);

    this._numFiles = document.createTextNode("");
    div.appendChild(this._numFiles);

    const span = document.createElement("span");
    span.setAttribute("class", "px-2");
    span.textContent = "·";
    div.appendChild(span);

    this._size = document.createTextNode("");
    div.appendChild(this._size);

    const progDiv = document.createElement("div");
    progDiv.setAttribute("class", "px-6 d-flex flex-items-center");
    div.appendChild(progDiv);

    this._progress = document.createElement("progress");
    this._progress.setAttribute("class", "progress");
    this._progress.setAttribute("id", "progress");
    this._progress.setAttribute("max", "100");
    this._progress.setAttribute("value", "0");
    this._progress.style.visibility = "hidden";
    progDiv.appendChild(this._progress);

    this._label = document.createElement("label");
    this._label.setAttribute("class", "d-flex px-2");
    this._label.setAttribute("for", "progress");
    this._label.style.visibility = "hidden";
    progDiv.appendChild(this._label);

    this._numProcesses = null;
  }

  static get observedAttributes() {
    return ["num-files", "size", "progress", "num-processes"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "num-files":
        let fileLabel = " files";
        if (newValue == 1) {
          fileLabel = " file";
        }
        this._numFiles.nodeValue = newValue + fileLabel;
        break;
      case "size":
        let num = newValue;
        let label = "B";
        if (newValue > 1e12) {
          num = num / 1e12;
          label = "TB";
        } else if (num > 1e9) {
          num = num / 1e9;
          label = "GB";
        } else if (num > 1e6) {
          num = num / 1e6;
          label = "MB";
        } else if (num > 1e3) {
          num = num / 1e3;
          label = "KB";
        }
        this._size.nodeValue = Number(num).toFixed(1) + label;
        break;
      case "progress":
        if (newValue === null) {
          this._progress.style.visibility = "hidden";
          this._label.style.visibility = "hidden";
        } else {
          this._progress.style.visibility = "show";
          this._progress.setAttribute("value", newValue);
          this._progress.textContent = newValue + "%";

          this._label.style.visibility = "show";
          if (this._numProcesses !== null) {
            let label = this._numProcesses + " processesâ€¦ " + newValue + "%";
            this._label.textContent = label;
          } else {
            this._label.textContent = newValue + "%";
          }
        }
        break;
      case "num-processes":
        this._numProcesses = newValue;
        break;
    }
  }
}

customElements.define("project-description", ProjectDescription);
