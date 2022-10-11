import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class SettingsNav extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("settings-nav-template").content;
    this._shadow.appendChild(template.cloneNode(true));

    // // Handlers
    // this.div = this._shadow.getElementById("settings-nav--div");
    // this.nav = this._shadow.getElementById("settings-nav--nav");
    this.setupMap();
  }

  highlightSelectedHeading(type) {
    this.open(type);

    for (let key of this.navByName.keys()) {
      const heading = this.navByName.get(key).nav._headingGroup;
      if (key === type) {
        heading.setAttribute("selected", "true");    
      } else {
        heading.setAttribute("selected", "false");
        this.shut(key);
      }
    }
  }

  highlightSelectedObjectId({type, id, inner = false}) {
    for (let key of this.navByName.keys()) {
      const nav = this.navByName.get(key).nav._headingGroup;
      console.log(nav);
      console.log(nav.linkMap);
      let link = null;
      if (!inner) {
        link = nav.linkMap.get(id);
        if (key === type) {
          link.setAttribute("selected", "true");
        } else {
          link.setAttribute("selected", "false");
        }
      } else {
        // set all regular links to unselected
        link = nav.linkMap.get(id);
        link.setAttribute("selected", "false");
        
        // find the correct inner link
        const innerLink = nav.innerLinkMap.get(id);
        if (key === type) {
          innerLink.setAttribute("selected", "true");
        } else {
          innerLink.setAttribute("selected", "false");
        }
      }
    }
  }

  hidePlaceHolder(type) {
    this.navByName.get(type).nav._placeholderGlow.hidden = true;
  }

  setLinks(type) {
    const typeStore = store.getState()[type];
    this.navByName.get(type).nav.renderSubNav(typeStore);
  }

  /**
   * @param {{ typeName: string; typeId: int; innerSelection: boolean }} val
   */
  set selection(val) {
    this._typeName = val.typeName;
    this._typeId = val.typeId;
    this._inner = val.innerSelection;
  }

  open(type) {
    console.log("Open type "+type)
    if(type !== "Project") this.navByName.get(type).nav._subNavSection.hidden = false;
  }
  shut(type) {
    if(type !== "Project") this.navByName.get(type).nav._subNavSection.hidden = true;
  }


  setupMap() {
    this.navByName = new Map();
    this.navByName.set("Project", {})
      .set("MediaType", {})
      .set("LocalizationType", {})
      .set("LeafType", {})
      .set("StateType", {})
      .set("Membership", {})
      .set("Version", {})
      .set("Algorithm", {})
      .set("Applet", {});
    
    // creates a named handle for each section
    for (let key of this.navByName.keys()) {
      const settingsNavLink = this._shadow.getElementById(`nav-for-${key}`);
      console.log(settingsNavLink);
      this.navByName.set(key, { nav: settingsNavLink });
    }
  }

}

customElements.define("settings-nav", SettingsNav);
