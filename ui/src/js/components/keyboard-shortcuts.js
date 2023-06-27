import { TatorElement } from "./tator-element.js";

export class KeyboardShortcuts extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "nav px-6");
    this._shadow.appendChild(this._div);

    const back = document.createElement("nav-back");
    this._div.appendChild(back);

    const col = document.createElement("div");
    col.setAttribute("class", "d-flex flex-column");
    this._div.appendChild(col);

    const heading = document.createElement("span");
    heading.setAttribute(
      "class",
      "nav__heading py-2 f3 text-semibold text-uppercase text-gray"
    );
    heading.textContent = "Keyboard Shortcuts";
    col.appendChild(heading);

    const shortcutsDiv = document.createElement("div");
    shortcutsDiv.setAttribute(
      "class",
      "nav__heading py-2 f3 text-semibold text-uppercase text-gray"
    );
    col.appendChild(shortcutsDiv);

    const shortcuts = [
      ["Box Annotation", "B", null],
      ["Line Annotation", "L", null],
      ["Point Annotation", "P", null],
      ["Redraw/Edit Annotation", "E", null],
      ["Undo", "Z", "\u{2318}"],
      ["Redo", "Y", "\u{2318}"],
      ["Large Video Player", "M", "\u{2318}"],
      ["Zoom In", "+", null],
      ["Zoom Out", "-", null],
      ["Toggle Text Overlay", "T", null],
      ["Skip Forward 1 Frame", "\u{2192}", null],
      ["Skip Backward 1 Frame", "\u{2190}", null],
      ["Skip Forward 1 Second", "\u{2192}", "Shift"],
      ["Skip Backward 1 Second", "\u{2190}", "Shift"],
      ["Skip Forward 1 Minute", "\u{2192}", "\u{2318}"],
      ["Skip Backward 1 Minute", "\u{2190}", "\u{2318}"],
      ["Play/Pause", "Space", null],
      ["Rewind", "R", null],
      ["1x Playback", "1", null],
      ["2x Playback", "2", null],
      ["4x Playback", "4", null],
      ["Increase rate", "\u{2191}", "\u{2318}"],
      ["Decrease rate", "\u{2193}", "\u{2318}"],
    ];

    for (let shortcut of shortcuts) {
      const elem = document.createElement("nav-shortcut");
      let [name, letter, modifier] = shortcut;
      elem.setAttribute("name", name);
      elem.setAttribute("letter", letter);
      if (modifier !== null) {
        elem.setAttribute("modifier", modifier);
      }
      shortcutsDiv.appendChild(elem);
    }

    back.addEventListener("click", (evt) => {
      this._div.classList.remove("is-open");
    });
  }

  static get observedAttributes() {
    return ["is-open"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "is-open":
        if (newValue === null) {
          this._div.classList.remove("is-open");
        } else {
          this._div.classList.add("is-open");
        }
    }
  }
}

customElements.define("keyboard-shortcuts", KeyboardShortcuts);
