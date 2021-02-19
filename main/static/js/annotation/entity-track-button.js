class EntityTrackButton extends TatorElement {
  constructor() {
    super();

    const button = document.createElement("button");
    button.setAttribute("class", "btn-clear d-flex flex-justify-center px-2 py-2 rounded-2 f2 text-white entity__button");
    this._shadow.appendChild(button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.fill = "none";
    button.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Go to associated track";
    svg.appendChild(title);

    const shape1 = document.createElementNS(svgNamespace, "rect");
    shape1.setAttribute("x", "3"); 
    shape1.setAttribute("y", "3");
    shape1.setAttribute("width", "7");
    shape1.setAttribute("height", "7");
    svg.appendChild(shape1);
    
    const shape2 = document.createElementNS(svgNamespace, "rect");
    shape2.setAttribute("x", "14"); 
    shape2.setAttribute("y", "3");
    shape2.setAttribute("width", "7");
    shape2.setAttribute("height", "7");
    svg.appendChild(shape2);
    
    const shape3 = document.createElementNS(svgNamespace, "rect");
    shape3.setAttribute("x", "14"); 
    shape3.setAttribute("y", "14");
    shape3.setAttribute("width", "7");
    shape3.setAttribute("height", "7");
    svg.appendChild(shape3);
    
    const shape4 = document.createElementNS(svgNamespace, "rect");
    shape4.setAttribute("x", "3"); 
    shape4.setAttribute("y", "14");
    shape4.setAttribute("width", "7");
    shape4.setAttribute("height", "7");
    svg.appendChild(shape4);
  }
}

customElements.define("entity-track-button", EntityTrackButton);
