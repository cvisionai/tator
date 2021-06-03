class EntityPanelNavigation extends TatorElement {
   constructor() {
      super();

      const controls = document.createElement("div");
      controls.setAttribute("class", "entity-panel-navigation");
      this._shadow.appendChild(controls);

      this.previous = document.createElement("entity-prev-button");
      controls.appendChild(this.previousButton);

      // this.nextButton = document.createElement("entity-next-button");
      // div.appendChild(this.nextButton);

      const details = document.createElement("details");
      details.setAttribute("class", "position-relative");
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

      this.next = document.createElement("entity-next-button");
      controls.appendChild(next);

   }

   init() {

   }
}

customElements.define("entity-panel-navigation", EntityPanelNavigation);