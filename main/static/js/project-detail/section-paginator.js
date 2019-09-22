class SectionPaginator extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "files__footer d-flex flex-items-center flex-justify-center py-3 position-relative f3 text-uppercase text-gray");
    this._shadow.appendChild(div);

    this._prev = document.createElement("section-prev");
    this._prev.setAttribute("class", "files__previous d-flex flex-items-center");
    div.appendChild(this._prev);

    this._expand = document.createElement("section-expand");
    this._expand.setAttribute("num-shown", SectionPaginator.collapsedFiles);
    div.appendChild(this._expand);

    this._next = document.createElement("section-next");
    this._next.setAttribute("class", "files__next d-flex flex-items-center");
    div.appendChild(this._next);

    this._text = document.createTextNode("");
    div.appendChild(this._text);

    this._prev.addEventListener("click", evt => {
      let newStart = Math.max(this._start - this._numShown, 0);
      this._stop -= this._start - newStart;
      this._start = newStart;
      this._emitRange();
    });

    this._next.addEventListener("click", evt => {
      const numFiles = this.getAttribute("num-files");
      let newStop = Math.min(this._stop + this._numShown, numFiles);
      this._start += newStop - this._stop;
      this._stop = newStop;
      this._emitRange();
    });

    this._expand.addEventListener("click", evt => {
      const numFiles = this.getAttribute("num-files");
      if (this._expand.hasAttribute("is-expanded")) {
        this._start = 0;
        this._stop = Math.min(numFiles, SectionPaginator.collapsedFiles);
        this._numShown = this._stop;
        this._expand.removeAttribute("is-expanded");
      } else {
        const inc = SectionPaginator.incrementFiles;
        this._numShown = Math.min(this._numShown + inc, numFiles);
        if (this._numShown == numFiles) {
          this._start = 0;
          this._stop = numFiles;
          this._expand.setAttribute("is-expanded", "");
        } else {
          this._stop = Math.min(this._start + this._numShown, numFiles);
          this._start = this._stop - this._numShown;
        }
      }
      this._emitRange();
    });
  }

  static get observedAttributes() {
    return ["num-files"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "num-files":
        this._expand.setAttribute("num-files", newValue);
        const needsInit = typeof this._numShown === "undefined";
        const belowMin = this._numShown < SectionPaginator.collapsedFiles;
        if (needsInit || belowMin) {
          this._start = 0;
          this._stop = Math.min(newValue, SectionPaginator.collapsedFiles);
          this._numShown = this._stop;
        } else {
          if (this._stop > newValue) {
            this._stop = newValue;
            this._numShown = this._stop - this._start;
          }
        }
        this._emitRange();

        if (newValue <= SectionPaginator.collapsedFiles) {
          let flabel = " files";
          if (newValue == 1) {
            flabel = " file";
          }
          this._text.nodeValue = "Showing " + newValue + " of " + newValue + flabel;
          this._prev.style.display = "none";
          this._next.style.display = "none";
          this._expand.style.display = "none";
        } else {
          this._text.nodeValue = "";
          this._prev.style.display = "flex";
          this._next.style.display = "flex";
          this._expand.style.display = "flex";
        }
        break;
    }
  }

  static get collapsedFiles() {
    return 6;
  }

  static get incrementFiles() {
    return 20;
  }

  _emitRange() {
    this.dispatchEvent(new CustomEvent("change", {
      detail: {
        start: this._start,
        stop: this._stop
      }
    }));
    this._expand.setAttribute("start", this._start + 1);
    this._expand.setAttribute("stop", this._stop);
  }
}

customElements.define("section-paginator", SectionPaginator);
