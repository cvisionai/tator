import { TatorElement } from "../components/tator-element.js";

export class SimpleEntitySelector extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-between position-relative entity__selector is-open"
    );
    this._shadow.appendChild(this._div);

    this._expand = document.createElement("button");
    this._expand.setAttribute(
      "class",
      "annotation__entity btn-clear px-4 col-12 css-truncate text-white"
    );
    this._div.appendChild(this._expand);

    this._name = document.createElement("span");
    this._name.setAttribute("class", "text-semibold");
    this._expand.appendChild(this._name);

    this._count = document.createElement("span");
    this._count.setAttribute("class", "px-1 text-gray");
    this._expand.appendChild(this._count);

    const controls = document.createElement("div");
    controls.setAttribute(
      "class",
      "annotation__entity-count d-flex flex-items-center px-4"
    );
    this._div.appendChild(controls);

    this._prev = document.createElement("entity-prev-button");
    controls.appendChild(this._prev);

    const details = document.createElement("details");
    details.setAttribute("class", "position-relative");
    details.setAttribute("id", "current-index");
    controls.appendChild(details);

    const summary = document.createElement("summary");
    summary.setAttribute("class", "d-flex flex-items-center px-1");
    summary.style.cursor = "pointer";
    details.appendChild(summary);

    this._current = document.createElement("span");
    this._current.setAttribute("class", "px-1 text-gray");
    this._current.textContent = "1";
    summary.appendChild(this._current);

    const styleDiv = document.createElement("div");
    styleDiv.setAttribute("class", "files__main files-wrap");
    details.appendChild(styleDiv);

    const div = document.createElement("div");
    div.setAttribute("class", "more d-flex flex-column f2 py-3 px-2");
    styleDiv.appendChild(div);

    this._slider = document.createElement("input");
    this._slider.setAttribute("class", "range flex-grow");
    this._slider.setAttribute("type", "range");
    this._slider.setAttribute("step", "1");
    this._slider.setAttribute("min", "0");
    this._slider.setAttribute("value", "0");
    div.appendChild(this._slider);

    this._next = document.createElement("entity-next-button");
    controls.appendChild(this._next);

    this._data = [];
    this._listIndex = -1;

    this._prev.addEventListener("click", () => {
      this._prev.blur();

      if (this._data.length > 0) {
        this.selectEntity(this._listIndex - 1);
      }
    });
    this._next.addEventListener("click", () => {
      this._next.blur();

      if (this._data.length > 0) {
        this.selectEntity(this._listIndex + 1);
      }
    });
    this._slider.addEventListener("input", () => {
      this._slider.blur();
      if (this._data.length > 0) {
        this.selectEntity(Number(this._slider.value));
      }
    });
  }

  set name(val) {
    this._name.textContent = val;
  }

  /**
   * Select entity based on the provided list index
   * @precondition this._data must have content
   */
  selectEntity(listIndex) {
    if (listIndex < 0) {
      this._listIndex = 0;
    } else if (listIndex >= this._data.length) {
      this._listIndex = this._data.length - 1;
    } else {
      this._listIndex = listIndex;
    }

    this._current.textContent = `${this._listIndex + 1}`;
    this._slider.value = this._listIndex;

    this.dispatchEvent(
      new CustomEvent("select", {
        detail: {
          data: this._data[this._listIndex],
        },
      })
    );
  }

  /**
   * Update the internal data list to cycle through
   * @param {array of Tator.Entity} data
   *    Array of tator entities (e.g. list of localizations).
   *    Used to determine the nav UI interactions.
   */
  update(data) {
    this._data = data;

    if (data.length == 0 || data == null) {
      this._count.textContent = "0";
      this._current.textContent = "N/A";
      this._slider.value = 0;
      this._listIndex = -1;
    } else {
      this._count.textContent = String(data.length);
      if (this._current.textContent == "N/A") {
        this._current.textContent = "1";
        this._listIndex = 0;
      }
      this._slider.max = data.length - 1;
      const haveData = data.length > 0;
      if (haveData && this._listIndex <= 0) {
        this._current.textContent = "1";
        this._slider.value = 0;
        this._listIndex = 0;
      }
      if (haveData && this._listIndex >= data.length) {
        this._current.textContent = String(data.length);
        this._slider.value = data.length - 1;
        this._listIndex = data.length - 1;
      }

      this.dispatchEvent(
        new CustomEvent("select", {
          detail: {
            data: this._data[this._listIndex],
          },
        })
      );
    }
  }
}
customElements.define("simple-entity-selector", SimpleEntitySelector);
