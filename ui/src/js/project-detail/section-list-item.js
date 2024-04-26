import { TatorElement } from "../components/tator-element.js";

/**
 * Button thats used as part of the section list
 */
export class SectionListItem extends TatorElement {
  /**
   * Constructor
   */
  constructor() {
    super();

    this.setupUIElements();
    this.setupEventListeners();
    this.setInactive();
    this.collapse();

    this._errorSection = false;
  }

  setupUIElements() {
    this._mainDiv = document.createElement("div");
    this._mainDiv.setAttribute(
      "class",
      "rounded-2 px-1 d-flex flex-items-center"
    );
    this._shadow.appendChild(this._mainDiv);

    this._errorIcon = document.createElement("div");
    this._errorIcon.setAttribute("class", "d-flex text-red pr-2");
    this._mainDiv.appendChild(this._errorIcon);
    this._errorIcon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" class="no-fill" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 9v4" /><path d="M12 16v.01" />
    </svg>
    `;
    this._errorIcon.style.display = "none";

    this._expand = document.createElement("div");
    this._expand.setAttribute(
      "class",
      "d-flex mr-1 d-flex flex-items-center clickable rounded-2"
    );
    this._mainDiv.appendChild(this._expand);
    this._expand.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" />
      </svg>
    `;

    this._icon = document.createElement("div");
    this._icon.setAttribute("class", "d-flex py-1");
    this._mainDiv.appendChild(this._icon);
    this._icon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
      </svg>
    `;

    this._id = document.createElement("div");
    this._id.setAttribute("class", "d-flex ml-2 f2");
    this._mainDiv.appendChild(this._id);
    this._id.style.display = "none";

    this._name = document.createElement("div");
    this._name.setAttribute(
      "class",
      "f2 text-gray ml-3 py-1 clickable flex-grow css-truncate"
    );
    this._mainDiv.appendChild(this._name);

    var moreWrapper = document.createElement("div");
    moreWrapper.setAttribute("class", "d-flex flex-justify-right");
    this._mainDiv.appendChild(moreWrapper);

    this._more = document.createElement("div");
    this._more.setAttribute("class", "d-flex mr-2 clickable rounded-2");
    moreWrapper.appendChild(this._more);
    this._more.innerHTML = `
      <svg transform="rotate(90)" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      </svg>
    `;
    this._more.style.display = "none";

    this._moreMenu = document.createElement("div");
    this._moreMenu.setAttribute(
      "class",
      "more d-flex flex-column f2 px-3 py-2 lh-condensed"
    );
    this.hideMoreMenu();
    this._moreMenu.style.marginTop = "5px";
    this._moreMenu.style.marginLeft = "200px";
    this._shadow.appendChild(this._moreMenu);

    //
    // Details section
    //
    this._detailsDiv = document.createElement("div");
    this._detailsDiv.setAttribute(
      "class",
      "pl-2 pt-1 pb-2 d-flex flex-column f3 text-dark-gray"
    );
    this._shadow.appendChild(this._detailsDiv);
    this._detailsDiv.style.display = "none";
  }

  setupEventListeners() {
    this._mainDiv.addEventListener("mouseover", () => {
      if (this._errorSection) {
        return;
      }
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "#262e3d";
        this._mainDiv.style.color = "#ffffff";
        this._name.classList.remove("text-gray");
        this._name.classList.add("text-white");
      }
      this._more.style.display = "flex";
    });

    this._mainDiv.addEventListener("mouseout", () => {
      if (this._errorSection) {
        return;
      }
      if (!this._active) {
        this._mainDiv.style.backgroundColor = "";
        this._mainDiv.style.color = "";
        this._name.classList.add("text-gray");
        this._name.classList.remove("text-white");
      }
      if (this._moreMenu.style.display == "none") {
        this._more.style.display = "none";
      }
    });

    this._name.addEventListener("click", () => {
      if (this._errorSection) {
        return;
      }
      this._mainDiv.blur();
      this.hideMoreMenu();
      this.setActive();
      this.dispatchEvent(
        new CustomEvent("selected", { detail: { id: this._section.id } })
      );
    });

    this._expand.addEventListener("mouseover", () => {
      this._expand.style.backgroundColor = "#3b4250";
    });

    this._expand.addEventListener("mouseout", () => {
      this._expand.style.backgroundColor = "";
    });

    this._expand.addEventListener("click", () => {
      this._mainDiv.blur();
      this.hideMoreMenu();
      if (this._expanded) {
        this.collapse();
        this.dispatchEvent(new Event("expand"));
      } else {
        this.expand();
        this.dispatchEvent(new Event("collapse"));
      }
    });

    this._more.addEventListener("mouseover", () => {
      if (this._errorSection) {
        return;
      }
      this._more.style.backgroundColor = "#3b4250";
    });

    this._more.addEventListener("mouseout", () => {
      if (this._errorSection) {
        return;
      }
      this._more.style.backgroundColor = "";
    });

    this._more.addEventListener("click", () => {
      if (this._moreMenu.style.display == "none") {
        this.showMoreMenu();
      } else {
        this.hideMoreMenu();
      }
    });

    this._mainDiv.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (this._errorSection) {
        return;
      }
      this.showMoreMenu();
    });
  }

  /**
   * @param {Tator.Section} section
   *    Section object to initialize the button with
   * @param {array} childSections
   *    Array of child sections (Tator.Section objects)
   * @param {bool} errorSection
   *    True if the provided section has an error in it.
   *    Will be displayed with the error icon and will not pad
   */
  init(section, childSections, errorSection) {
    this._section = section;
    this._childSections = childSections;
    this._errorSection = errorSection;

    // If section.path exists, use it to pad.
    // Use section.name as display
    var padding = 0;
    if (section.path) {
      var pathParts = section.path.split(".");
      padding = 10 * (pathParts.length - 1);
    }
    this._name.innerHTML = section.name;

    if (this._errorSection) {
      this._errorIcon.style.display = "flex";
      this._expand.style.display = "none";

      if (!section.visible) {
        this._name.classList.add("text-dark-gray");
        this._icon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
          </svg>
        `;
      }
    } else {
      // Add the appropriate padding based on how many parents this section has
      // 10px margin left for each parent
      if (childSections.length > 0) {
        // There are child sections, show the expand icon
        this._expand.style.marginLeft = `${padding}px`;
      } else {
        // If no children, remove the expand icon
        this._expand.style.visibility = "hidden";
        this._icon.style.marginLeft = `${padding}px`;
      }

      if (!section.visible) {
        this._name.classList.add("text-dark-gray");
        this._icon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
          </svg>
        `;
      }
    }

    // Update the more menu
    const hideToggleButton = document.createElement("button");
    hideToggleButton.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    if (section.visible) {
      hideToggleButton.innerHTML = `
      <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
      Hide folder`;
      hideToggleButton.addEventListener("click", () => {
        this.hideMoreMenu();
        this.dispatchEvent(
          new CustomEvent("hideSection", { detail: { id: section.id } })
        );
      });
    } else {
      hideToggleButton.innerHTML = `
      <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
      Restore folder`;
      hideToggleButton.addEventListener("click", () => {
        this.hideMoreMenu();
        this.dispatchEvent(
          new CustomEvent("restoreSection", { detail: { id: section.id } })
        );
      });
    }
    const deleteToggleButton = document.createElement("button");
    deleteToggleButton.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    deleteToggleButton.innerHTML = `
    <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
    Delete folder`;
    if (childSections.length > 0) {
      deleteToggleButton.setAttribute("disabled", "");
      deleteToggleButton.style.cursor = "not-allowed";
      deleteToggleButton.setAttribute(
        "tooltip",
        "Cannot delete folder when it has subfolders."
      );
    } else {
      deleteToggleButton.addEventListener("click", () => {
        this.hideMoreMenu();
        this.dispatchEvent(
          new CustomEvent("deleteSection", { detail: { id: section.id } })
        );
      });
    }

    const addToggleButton = document.createElement("button");
    addToggleButton.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    addToggleButton.innerHTML = `
    <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 19h-7a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v3.5" /><path d="M16 19h6" /><path d="M19 16v6" />
    </svg>
    Add subfolder`;
    addToggleButton.addEventListener("click", () => {
      this.hideMoreMenu();
      this.dispatchEvent(
        new CustomEvent("addSection", { detail: { id: section.id } })
      );
    });

    const moveToggleButton = document.createElement("button");
    moveToggleButton.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    moveToggleButton.innerHTML = `
    <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 9l3 3l-3 3" /><path d="M15 12h6" /><path d="M6 9l-3 3l3 3" /><path d="M3 12h6" /><path d="M9 18l3 3l3 -3" /><path d="M12 15v6" /><path d="M15 6l-3 -3l-3 3" /><path d="M12 3v6" />
    </svg>
    Move folder`;
    moveToggleButton.addEventListener("click", () => {
      this.hideMoreMenu();
      this.dispatchEvent(
        new CustomEvent("moveSection", { detail: { id: section.id } })
      );
    });

    const renameToggleButton = document.createElement("button");
    renameToggleButton.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    renameToggleButton.innerHTML = `
    <svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
    Rename folder`;
    renameToggleButton.addEventListener("click", () => {
      this.hideMoreMenu();
      this.dispatchEvent(
        new CustomEvent("renameSection", { detail: { id: section.id } })
      );
    });

    this._moreMenu.appendChild(addToggleButton);
    this._moreMenu.appendChild(moveToggleButton);
    this._moreMenu.appendChild(renameToggleButton);
    this._moreMenu.appendChild(deleteToggleButton);
    this._moreMenu.appendChild(hideToggleButton);

    this._id.innerHTML = `<span class="text-semibold text-gray">id: </span><span class="ml-1 text-white">${section.id}</span>`;

    this._detailsDiv.innerHTML = `
    <div><span class="text-semibold text-gray col-8">path:</span> ${section.path}</div>
    <div><span class="text-semibold text-gray">tator_user_sections:</span> ${section.tator_user_sections}</div>
    `;
    if (section.object_search != null) {
      this._detailsDiv.innerHTML += `
        <div><span class="text-semibold text-gray">object_search:</span> ${section.object_search}</div>
      `;
    }
    if (section.related_search != null) {
      this._detailsDiv.innerHTML += `
        <div><span class="text-semibold text-gray">related_search:</span> ${section.related_search}</div>
      `;
    }
  }

  /**
   * Display this list item as active
   */
  setActive() {
    this._active = true;
    this._mainDiv.style.backgroundColor = "#202543";
    this._mainDiv.style.color = "#ffffff";
    this._name.classList.remove("text-gray");
    this._name.classList.add("text-white");
    this._name.classList.add("text-semibold");
  }

  /**
   * Display this list item as inactive
   */
  setInactive() {
    this._active = false;
    this._mainDiv.style.backgroundColor = "";
    this._mainDiv.style.color = "";
    this._name.classList.add("text-gray");
    this._name.classList.remove("text-white");
    this._name.classList.remove("text-semibold");
    this.hideMoreMenu();
  }

  /**
   * Hide the more menu
   */
  hideMoreMenu() {
    this._more.style.display = "none";
    this._moreMenu.style.display = "none";
    this._mainDiv.classList.remove("purple-box-border");
  }

  /**
   * Show the more menu
   * Highlights the UI and dispatches a showMoreMenu event
   */
  showMoreMenu() {
    this._more.style.display = "flex";
    this._moreMenu.style.display = "block";
    this.dispatchEvent(new Event("showMoreMenu"));
    this._mainDiv.classList.add("purple-box-border");
  }

  /**
   * @returns {Tator.Section} section object associated with this list item
   */
  getSection() {
    return this._section;
  }

  collapse() {
    this._expanded = false;
    this._expand.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" />
      </svg>
    `;
  }

  expand() {
    this._expanded = true;
    this._expand.innerHTML = `
      <svg transform="rotate(90)" width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" />
      </svg>
    `;
  }

  /**
   * Hide the advanced details panel showing information about the section
   */
  hideAdvancedDetails() {
    this._id.style.display = "none";
    this._detailsDiv.style.display = "none";
  }

  /**
   * Show the advanced details panel showing information about the section
   */
  showAdvancedDetails() {
    this._id.style.display = "flex";
    this._detailsDiv.style.display = "block";
  }
}
customElements.define("section-list-item", SectionListItem);
