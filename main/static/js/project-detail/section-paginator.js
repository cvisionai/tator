class SectionPaginator extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "pagination d-flex flex-items-center f3 py-6 text-gray");
    this._shadow.appendChild(div);

    this._prev = document.createElement("a");
    this._prev.setAttribute("class", "is-disabled unselectable");
    div.appendChild(this._prev);

    const prevSvg = document.createElementNS(svgNamespace, "svg");
    prevSvg.setAttribute("class", "px-1");
    prevSvg.setAttribute("viewBox", "0 0 24 24");
    prevSvg.setAttribute("height", "1em");
    prevSvg.setAttribute("width", "1em");
    this._prev.appendChild(prevSvg);

    const prevPath = document.createElementNS(svgNamespace, "path");
    prevPath.setAttribute("d", "M12.707 18.293l-5.293-5.293h11.586c0.552 0 1-0.448 1-1s-0.448-1-1-1h-11.586l5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-7 7c-0.096 0.096-0.168 0.206-0.217 0.324-0.051 0.122-0.076 0.253-0.076 0.383 0 0.256 0.098 0.512 0.293 0.707l7 7c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414z");
    prevSvg.appendChild(prevPath);

    const prevText = document.createTextNode("Previous");
    this._prev.appendChild(prevText);

    this._pages = []
    for (let idx = 0; idx < 5; idx++) {
      this._pages.push(document.createElement("a"));
      this._pages[idx].addEventListener("click", evt => {
        this._setPage(Number(evt.target.textContent) - 1);
        this._emit();
      });
      this._pages[idx].style.cursor = "pointer";
      div.appendChild(this._pages[idx]);
    }

    this._ellipsis = document.createElement("span");
    this._ellipsis.setAttribute("class", "pagination__ellipsis");
    this._ellipsis.textContent = "...";
    div.appendChild(this._ellipsis);

    this._last = document.createElement("a");
    this._last.style.cursor = "pointer";
    div.appendChild(this._last);

    this._next = document.createElement("a");
    this._next.setAttribute("class", "unselectable");
    div.appendChild(this._next);

    const nextText = document.createTextNode("Next");
    this._next.appendChild(nextText);

    const nextSvg = document.createElementNS(svgNamespace, "svg");
    nextSvg.setAttribute("class", "px-1");
    nextSvg.setAttribute("viewBox", "0 0 24 24");
    nextSvg.setAttribute("height", "1em");
    nextSvg.setAttribute("width", "1em");
    this._next.appendChild(nextSvg);

    const nextPath = document.createElementNS(svgNamespace, "path");
    nextPath.setAttribute("d", "M11.293 5.707l5.293 5.293h-11.586c-0.552 0-1 0.448-1 1s0.448 1 1 1h11.586l-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l7-7c0.092-0.092 0.166-0.202 0.217-0.324 0.101-0.245 0.101-0.521 0-0.766-0.049-0.118-0.121-0.228-0.217-0.324l-7-7c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z");
    nextSvg.appendChild(nextPath);

    this._prev.addEventListener("click", () => {
      this._setPage(Math.max(0, this._page - 1));
      this._emit();
    });

    this._next.addEventListener("click", () => {
      this._setPage(Math.min(this._numPages - 1, this._page + 1));
      this._emit();
    });

    this._last.addEventListener("click", () => {
      this._setPage(this._numPages - 1);
      this._emit();
    });

    this._pageSize = 100;
  }

  init(numFiles) {
    this._numFiles = numFiles;
    this._numPages = Math.ceil(this._numFiles / this._pageSize);
    this._last.textContent = this._numPages;
    this._setPage(0);
  }

  _setPage(page) {
    this._page = page;

    // Update appearance to reflect new page.
    if (page == 0) {
      this._prev.removeAttribute("style");
      this._prev.setAttribute("class", "is-disabled");
      this._next.style.cursor = "pointer";
      this._next.classList.remove("is-disabled");
    } else if (page == this._numPages - 1) {
      this._prev.style.cursor = "pointer";
      this._prev.classList.remove("is-disabled");
      this._next.removeAttribute("style");
      this._next.setAttribute("class", "is-disabled");
    } else {
      this._prev.style.cursor = "pointer";
      this._prev.classList.remove("is-disabled");
      this._next.style.cursor = "pointer";
      this._next.classList.remove("is-disabled");
    }
    if (page < Math.ceil(this._pages.length / 2)) {
      for (let idx = 0; idx < this._pages.length; idx++) {
        const val = idx + 1;
        this._pages[idx].textContent = val;
        if (val == page + 1) {
          this._pages[idx].setAttribute("class", "is-active");
        } else {
          this._pages[idx].classList.remove("is-active");
        }
      }
      this._ellipsis.style.display = "block";
      this._last.style.display = "block";
    } else if (page > Math.floor(this._numPages - (this._pages.length / 2))) {
      for (let idx = 0; idx < this._pages.length; idx++) {
        const val = this._numPages - this._pages.length + idx + 1
        this._pages[idx].textContent = val;
        if (val == page + 1) {
          this._pages[idx].setAttribute("class", "is-active");
        } else {
          this._pages[idx].classList.remove("is-active");
        }
      }
      this._ellipsis.style.display = "none";
      this._last.style.display = "none";
    } else {
      const offset = Math.floor(this._pages.length / 2);
      for (let idx = 0; idx < this._pages.length; idx++) {
        const val = page - offset + idx + 1;
        this._pages[idx].textContent = val;
        if (val == page + 1) {
          this._pages[idx].setAttribute("class", "is-active");
        } else {
          this._pages[idx].classList.remove("is-active");
        }
      }
      this._ellipsis.style.display = "block";
      this._last.style.display = "block";
    }
  }

  _emit() {
    // Dispatch event indicating start/stop.
    this.dispatchEvent(new CustomEvent("selectPage", {
      detail: {
        start: this._page * this._pageSize,
        stop: Math.min(this._numFiles, (this._page + 1) * this._pageSize),
      },
    }));
  }
}

customElements.define("section-paginator", SectionPaginator);
