import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class SettingsNavLink extends TatorElement {
  constructor() {
    super();

    // Main Div wrapper
    const template = document.getElementById("settings-nav-link").content;
    this._shadow.appendChild(template.cloneNode(true));

    // Template handles for page
    this._subNavGroup = this._shadow.getElementById("sub-nav");
    this._headingGroup = this._shadow.getElementById("sub-nav--heading-group");
    this._headingButton = this._shadow.getElementById(
      "sub-nav--heading-button"
    );
    this._headingIcon = this._shadow.getElementById("sub-nav--icon");
    this._subNavLabel = this._shadow.getElementById("sub-nav--label");
    this._subNavPlus = this._shadow.getElementById("sub-nav--plus-link");
    this._subNavSection = this._shadow.getElementById("sub-nav--section");
    this._placeholderGlow = this._shadow.getElementById("placeholder-glow");

    // Init values for global variables
    this.linkMap = new Map();
    this.innerLinkMap = new Map();
    this._typeId = null;
    this._inner = false;
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

  connectedCallback() {
    store.subscribe((state) => state.selection, this.showSelection.bind(this));
    store.subscribe((state) => state[this._type], this.renderSubNav.bind(this));

    const removeAdd = this.getAttribute("add");
    if (removeAdd === "false") {
      this._subNavPlus.classList.add("hidden");
    }

    this._subNavPlus.setAttribute("href", `#${this._type}-New`);
    this._headingButton.addEventListener("click", this.toggle.bind(this));
  }

  /**
   *
   * @param {*} newSelection
   * @param {*} oldSelection
   */
  async showSelection(newSelection, oldSelection) {
    this._inner = newSelection.typeName == "Leaf";
    const newType =
      newSelection.typeName == "Leaf" ? "LeafType" : newSelection.typeName;
    const oldType =
      oldSelection.typeName == "Leaf" ? "LeafType" : oldSelection.typeName;

    if (![newType, oldType].includes(this._type)) {
      // Nothing applies to me, do nothing
      return true;
    }

    // Variables for handling selection state
    const myTypeIsNew = this._type === newType;
    const selectedTypeIsNew = newType !== oldType;
    const newId = newSelection.typeId;
    const oldId = oldSelection.typeId;
    const selectedIdIsNew = newId !== oldId;

    if (selectedTypeIsNew || selectedIdIsNew) {
      // IF: Something changed, then Check Heading highlight
      if (myTypeIsNew) {
        this.highlightHeading();
        this.open();
      } else if (!myTypeIsNew && selectedTypeIsNew) {
        this.unhighlightHeading();
        this.shut();
      }

      // New item, highlight and unhighlight (if applicable in this section - handled in functions)
      if (selectedIdIsNew) {
        this._typeId = newId;
        this.highlightLink(newId);
        this.unhighlightLink(oldId);
      }
    }
  }

  highlightHeading() {
    if (this._headingGroup) {
      this._headingGroup.setAttribute("selected", "true");
    } else {
      console.warn("No nav heading found to higlight in settings nav.");
    }
  }

  unhighlightHeading() {
    if (this._headingGroup) {
      this._headingGroup.setAttribute("selected", "false");
    }
  }

  highlightLink(id, inner = this._inner) {
    const selectMe = inner ? this.innerLinkMap.get(id) : this.linkMap.get(id);
    if (selectMe) {
      selectMe.setAttribute("selected", "true");
    }
  }

  unhighlightLink(id, inner = this._inner) {
    const deselectMe = inner ? this.innerLinkMap.get(id) : this.linkMap.get(id);
    if (deselectMe) {
      deselectMe.setAttribute("selected", "false");
    }
  }

  hidePlaceHolder() {
    if (this._placeholderGlow) {
      this._placeholderGlow.hidden = true;
    } else {
      console.warn("No placeholder found to hide in settings nav.");
    }
  }

  // Simple toggle based on hidden attr
  toggle() {
    const isHidden = this._subNavSection.hidden;
    if (isHidden) {
      this.open();
    } else {
      this.shut();
    }
  }

  /**
   * Open
   * Also handles hiding loading placeholders
   * And making sure data is available when section is toggled
   */
  async open() {
    if (this._subNavSection) {
      this._subNavSection.hidden = false;
      if (store.getState()[this._type].init === false) {
        await store.getState().fetchType(this._type);
        this.hidePlaceHolder();
      }
    } else {
      console.warn("No nav found to open in settings nav.");
    }
  }

  // Shuts the nav
  shut() {
    if (this._subNavSection) {
      this._subNavSection.hidden = true;
    } else {
      console.warn(
        "No nav was open before, or could not be found to shut in settings nav."
      );
    }
  }

  /**
   * Removes all links and clears the Maps
   */
  clearNav() {
    this._subNavSection.innerHTML = "";
    this.linkMap.clear();
    this.innerLinkMap.clear();
  }

  /**
   * Creates or recreates the subnav based on data updates
   * @param {*} newData
   */
  renderSubNav(newData) {
    const typeName = newData.name;

    // This just clears and re-adds
    this.clearNav();

    for (const id of newData.setList) {
      const currentData = newData.map.get(id);
      const objectName =
        typeName === "Membership" ? currentData.username : currentData.name;
      this.getLink(typeName, currentData.id, objectName);

      if (typeName == "LeafType") {
        // Get companian inner link for "Leaf"
        this.getInnerLink(currentData.name, currentData.id);
      }
    }

    // Get +Add New for all except Project sub navs
    if (newData.name !== "Project") {
      this.getLink(newData.name, "New", "+ Add new");
    }
  }

  /**
   * Creates a linke element for supplied data and appends it to nav
   * */
  getLink(
    type,
    typeDataId,
    objectName,
    selector = `${type}-${typeDataId}`,
    inner = false
  ) {
    // Add the sidebar link to toggle this div open
    const subNavLink = document.createElement("a");
    subNavLink.setAttribute(
      "class",
      `SideNav-subItem ${typeDataId == "New" ? "text-italic" : ""}`
    );
    subNavLink.href = `#${selector}`;
    subNavLink.innerHTML = objectName;

    // Add new link to map for use later
    if (inner) {
      this.innerLinkMap.set(String(id), subNavLink);
    } else {
      this.linkMap.set(String(typeDataId), subNavLink);
    }

    if (this._typeId !== null && this._typeId == typeDataId) {
      subNavLink.setAttribute("selected", "true");
    }

    this._subNavSection.append(subNavLink);
  }

  // Additional prework to getLink for innerLink info
  getInnerLink(type, typeDataId) {
    // This is for LEAF TYPE only (sub container)
    let innerSelector = `Leaf-${typeDataId}`;
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="20" height="20" viewBox="0 0 32 25" data-tags="site map,tree,map"><g transform="scale(0.03125 0.03125)"><path d="M767.104 862.88h-95.68c-17.6 0-31.904-14.24-31.904-31.872v-63.808c0-17.568 14.304-31.872 31.904-31.872h63.776v-159.488h-223.264v159.488h31.872c17.632 0 31.904 14.304 31.904 31.872v63.808c0 17.632-14.272 31.872-31.904 31.872h-95.68c-17.6 0-31.872-14.24-31.872-31.872v-63.808c0-17.568 14.272-31.872 31.872-31.872h31.936v-159.488h-223.296v159.488h63.776c17.632 0 31.904 14.304 31.904 31.872v63.808c0 17.632-14.272 31.872-31.904 31.872h-95.648c-17.632 0-31.904-14.24-31.904-31.872v-63.808c0-17.568 14.272-31.872 31.904-31.872v-159.488-31.872h255.168v-127.584h-95.68c-17.632 0-31.904-14.272-31.904-31.904l0-159.488c0-17.6 14.272-31.904 31.904-31.904h223.264c17.632 0 31.872 14.272 31.872 31.904v159.456c0 17.6-14.24 31.904-31.872 31.904h-95.68v127.584h255.168v31.872 159.488c17.6 0 31.904 14.304 31.904 31.872v63.808c-0.032 17.664-14.368 31.904-31.936 31.904zM224.896 767.2v63.808h95.648v-63.808h-95.648zM607.616 384.48v-159.488h-223.264v159.456h223.264zM448.128 767.2v63.808h95.68v-63.808h-95.68zM767.104 767.2h-95.68v63.808h95.68v-63.808z"></path></g></svg>`;
    this.getLink(type, typeDataId, `${icon} Add/Edit Leaves`, innerSelector);
  }
}

customElements.define("settings-nav-link", SettingsNavLink);
