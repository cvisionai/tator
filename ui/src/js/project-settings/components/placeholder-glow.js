import { TatorElement } from "../../components/tator-element.js";

export class PlaceholderGlow extends TatorElement {
   constructor() {
      super();

      this.div = document.createElement("div");
      this.div.setAttribute("class", "placeholder-glow");
      this._shadow.appendChild(this.div);

      this._row = document.createElement("span");
      this._row.setAttribute("class", "placeholder SideNav-subItem");
      this._row.style = `width: ${String((Math.random() * (110 - 80) + 80).toFixed(0))}px`;

      //    <div class="placeholder-glow">
      //    <a class="SideNav-subItem placeholder bg-charcoal-medium"> &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp;  </a>
      //    <a class="SideNav-subItem placeholder bg-gray-light"> &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; </a>
      //    <a class="SideNav-subItem placeholder bg-gray-light"> &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp; </a>
      //    <a class="SideNav-subItem placeholder bg-gray-light"> &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  </a>
      //    <a class="SideNav-subItem placeholder bg-gray-light"> &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; </a>
      //    <a class="SideNav-subItem placeholder bg-gray-light"> &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp; </a>
      //  </div>
      this._className = "";

   }

   /*  */
   static get observedAttributes() {
      return ["rows", "className"];
   }
   attributeChangedCallback(name, oldValue, newValue) {
      switch (name) {
         case "rows":
            
            for (let x = 0; x <= newValue; x++) {
               const cloneRow = this._row.cloneNode();
               console.log("clone row.......");
               console.log(cloneRow);
               this.div.appendChild(cloneRow);
            }
            break;
         case "className":
            this._className = newValue;
            console.log("Add className newValue="+newValue);
            for (let row of this.div.children) {
               row.classList.add(newValue);
            }
            this._row.classList.add(this._className);
            break;
      }
   }
}

if (!customElements.get("placeholder-glow")) {
   customElements.define("placeholder-glow", PlaceholderGlow);
}
