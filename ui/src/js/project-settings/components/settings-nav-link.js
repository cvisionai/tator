import { TatorElement } from "../../components/tator-element.js";

export class SettingsNavLink extends TatorElement {
   constructor() {
      super();

      // Main Div wrapper
      //  this._shadow = this.attachShadow({mode: "open"});
      const template = document.getElementById("settings-nav-link").content;
      this._shadow.appendChild(template.cloneNode(true));

      this._subNavGroup = this._shadow.getElementById("sub-nav");
      this._headingGroup = this._shadow.getElementById("sub-nav--heading-group");
      this._headingButton = this._shadow.getElementById("sub-nav--heading-button");
      this._headingIcon = this._shadow.getElementById("sub-nav--icon");
      this._subNavLabel = this._shadow.getElementById("sub-nav--label");
      this._subNavPlus = this._shadow.getElementById("sub-nav--plus-link");
      this._subNavSection = this._shadow.getElementById("sub-nav--section");
      this._placeholderGlow = this._shadow.getElementById("placeholder-glow");

      this.linkMap = new Map();
      this.innerLinkMap = new Map();
   }

   static get observedAttributes() {
      return ["type"];
   }
   attributeChangedCallback(prop, oldValue, newValue) {
      if (prop === "type") {
         this._type = newValue;
         this.setAttribute("id", `nav-for-${this._type}`);
         this._headingButton.setAttribute("type", this._type);
      }
   }

   renderSubNav(data) {
      // This just clears and re-adds
      this._subNavSection.innerHTML = "";
      this.linkMap.clear();
      this.innerLinkMap.clear();

      for (const id of data.setList) {
         const typeData = data.map.get(id);

         const link = this.getLink(data.name, id, typeData.name);
         this._subNavSection.append(link);
         this.linkMap.set(id, link);

         if (data.name == "LeafType") {
            const innerLink = this.getInnerLink(data.name, id);
            this._subNavSection.append(innerLink);
            this.innerLinkMap.set(id, innerLink);
         }
      }
      if (data.name !== "Project") {
         const link = this.getLink(data.name, "New", "+ Add new");
         this._subNavSection.append(link);
         this.linkMap.set("New", link);
      }
   }

   getLink(type, typeDataId, objectName, selector = `${type}-${typeDataId}`) {
      // Add the sidebar link to toggle this div open
      const subNavLink = document.createElement("a");
      subNavLink.setAttribute("class", `SideNav-subItem ${(typeDataId == "New") ? "text-italic" : ""}`);
      subNavLink.href = `#${selector}`;
      subNavLink.textContent = objectName;
  
      // // Add link to sidebar
      // const newLink = this._shadow.querySelector(`a.SideNav-subItem[href="#${type}-New"]`)
      // if (newLink) {
      //   newLink.before(subNavLink);
      // } else {
      //   section.appendChild(subNavLink);
      // }
      return subNavLink;
   }
   
   getInnerLink(type, typeDataId) {
      // This is for LEAF TYPE only (sub container)
      let innerSelector = `#${type}-${typeDataId}_inner`
      let innerSubNavLink = this.getLink(type, typeDataId, "[+] Add/Edit Leaves", innerSelector);
      subNavLink.after(innerSubNavLink);
   }
}

customElements.define("settings-nav-link", SettingsNavLink);
