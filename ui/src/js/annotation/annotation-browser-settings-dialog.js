import { ModalDialog } from "../components/modal-dialog.js";
import { svgNamespace } from "../components/tator-element.js";

export class AnnotationBrowserSettingsDialog extends ModalDialog {
  constructor() {
    super();

    this._header.classList.remove("py-6");
    this._header.classList.add("py-3");
    this._main.classList.remove("px-6");
    this._main.classList.add("px-3");
    this._main.classList.remove("px-4");
    this._main.classList.add("py-3");

    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._title.nodeValue = "Annotation Browser Settings";

    this._tabsDiv = document.createElement("div");
    this._tabsDiv.setAttribute(
      "class",
      "d-flex flex-grow flex-justify-center mb-3 f3"
    );
    //this._main.appendChild(this._tabsDiv);

    this._viewSettingsButton = document.createElement("button");
    this._viewSettingsButton.setAttribute("class", "tab-btn");
    this._viewSettingsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="no-fill mr-1" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M9 6l11 0"></path>
    <path d="M9 12l11 0"></path>
    <path d="M9 18l11 0"></path>
    <path d="M5 6l0 .01"></path>
    <path d="M5 12l0 .01"></path>
    <path d="M5 18l0 .01"></path>
    </svg> View`;
    this._tabsDiv.appendChild(this._viewSettingsButton);

    this._loadButton = document.createElement("div");
    this._loadButton.setAttribute("class", "tab-btn");
    this._loadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="no-fill mr-1" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
    <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
    <path d="M12 11v6"></path>
    <path d="M9.5 13.5l2.5 -2.5l2.5 2.5"></path>
    </svg> Load`;
    this._tabsDiv.appendChild(this._loadButton);

    this._viewSettingsButton.addEventListener("click", () => {
      this._viewSettingsButton.blur();
      this._viewSettingsButton.classList.add("active");
      this._loadButton.classList.remove("active");
      this._displayPage("viewSettings");
    });

    this._loadButton.addEventListener("click", () => {
      this._loadButton.blur();
      this._viewSettingsButton.classList.remove("active");
      this._loadButton.classList.add("active");
      this._displayPage("load");
    });

    this._viewSettingsDiv = document.createElement("div");
    this._viewSettingsDiv.setAttribute("class", "d-flex flex-column");
    this._main.appendChild(this._viewSettingsDiv);

    this._data = null; // Reference to an annotation-data object

    this._displayPage("viewSettings");
  }

  /**
   * @param {string} page "viewSettings" | "load"
   */
  _displayPage(page) {
    if (page == "viewSettings") {
      this._viewSettingsDiv.style.display = "flex";
    }
  }

  /**
   * Create chevron SVG seen elsewhere in Tator
   * @return <svg>
   */
  _makeChevron() {
    const chevron = document.createElementNS(svgNamespace, "svg");
    chevron.setAttribute("class", "chevron px-1 chevron-trigger-90");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("height", "1em");
    chevron.setAttribute("width", "1em");

    const chevronPath = document.createElementNS(svgNamespace, "path");
    chevronPath.setAttribute(
      "d",
      "M9.707 18.707l6-6c0.391-0.391 0.391-1.024 0-1.414l-6-6c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0z"
    );

    chevron.appendChild(chevronPath);
    return chevron;
  }

  /**
   * Create attribute name checkbox element
   * @return <checkbox-input>
   */
  _makeCheckbox(name) {
    let checkbox = document.createElement("checkbox-input");
    checkbox.setAttribute("name", name);
    checkbox.setAttribute("class", "f3");
    checkbox._input.style.marginLeft = "20px";
    checkbox.styleSpan.setAttribute("class", "px-2");
    checkbox._checked = true;
    checkbox._input.style.cursor = "pointer";
    checkbox.styleSpan.style.cursor = "pointer";
    return checkbox;
  }

  /**
   * Used in conjunction with _makeAttributeSections()
   */
  _makeAttributePage(pageParentDiv, dataType) {
    var parentDiv = document.createElement("div");
    parentDiv.setAttribute("class", "d-flex flex-grow flex-column col-12");
    pageParentDiv.appendChild(parentDiv);

    var headerDiv = document.createElement("div");
    headerDiv.setAttribute("class", "d-flex col-12");
    parentDiv.appendChild(headerDiv);

    var visibilityTab = document.createElement("button");
    visibilityTab.setAttribute("class", "page-tab active f2");
    visibilityTab.style.width = "200px";
    visibilityTab.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="no-fill px-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
    </svg>
    More/Less
    `;
    headerDiv.appendChild(visibilityTab);

    var infoDiv = document.createElement("div");
    infoDiv.setAttribute(
      "class",
      "d-flex flex-grow flex-column col-12 purple-box-border py-3 annotation_browser_settings_wrapper"
    );
    parentDiv.appendChild(infoDiv);

    var description = document.createElement("div");
    description.setAttribute("class", "f2 text-dark-gray px-3 py-3");
    description.textContent =
      "Select the attributes that should always be displayed when toggling the More/Less option in the annotation browser.";
    infoDiv.appendChild(description);

    var innerInfoDiv = document.createElement("div");
    innerInfoDiv.setAttribute("class", "d-flex flex-grow col-12");
    infoDiv.appendChild(innerInfoDiv);

    //
    // Organize the attributes by order and visibility
    //
    var visibleAttributes = [];
    var hiddenAttributes = [];

    if (
      dataType.dtype == "video" ||
      dataType.dtype == "image" ||
      dataType.dtype == "multi"
    ) {
      var builtInAttributes = [];
    } else {
      var builtInAttributes = [
        "Elemental ID",
        "Mark",
        "ID",
        "Version",
        "Frame",
      ];
    }

    const allSortedAttrTypes = dataType.attribute_types.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    // Next organize the attribute names
    for (const attrType of allSortedAttrTypes) {
      if (attrType.order < 0) {
        hiddenAttributes.push(attrType.name);
      } else if (attrType.visible == false) {
        hiddenAttributes.push(attrType.name);
      } else {
        visibleAttributes.push(attrType.name);
      }
    }

    //
    // Create a section for the built-in attributes
    //
    var wrapperDiv = document.createElement("div");
    wrapperDiv.setAttribute("class", "d-flex flex-column mx-3");
    innerInfoDiv.appendChild(wrapperDiv);

    var labelDiv = document.createElement("div");
    labelDiv.setAttribute(
      "class",
      "f2 text-gray text-semibold clickable py-2 chevron-trigger-90"
    );
    labelDiv.textContent = "Built-in Attributes";
    wrapperDiv.appendChild(labelDiv);
    var chevron = this._makeChevron();
    labelDiv.appendChild(chevron);

    var builtinInfoDiv = document.createElement("div");
    builtinInfoDiv.setAttribute(
      "class",
      "annotation__panel-group annotation__panel-border py-3 px-2 text-gray f2 mb-2"
    );
    wrapperDiv.appendChild(builtinInfoDiv);

    labelDiv.addEventListener("click", (evt) => {
      builtinInfoDiv.hidden = !builtinInfoDiv.hidden;
      evt.target.classList.toggle("chevron-trigger-90");
    });

    for (const attrName of builtInAttributes) {
      let checkbox = this._makeCheckbox(attrName);
      checkbox._checked = this._browserSettings.isAlwaysVisible(
        dataType,
        attrName
      );
      builtinInfoDiv.appendChild(checkbox);

      checkbox.addEventListener("change", () => {
        this._browserSettings.setAlwaysVisible(
          dataType,
          attrName,
          checkbox.getChecked()
        );
      });
    }

    //
    // Create a section for the visible user attributes
    //
    if (visibleAttributes.length == 0) {
      return parentDiv;
    }

    var wrapperDiv = document.createElement("div");
    wrapperDiv.setAttribute("class", "d-flex flex-column mx-3");
    innerInfoDiv.appendChild(wrapperDiv);

    var labelDiv = document.createElement("div");
    labelDiv.setAttribute(
      "class",
      "f2 text-gray text-semibold clickable py-2 chevron-trigger-90"
    );
    labelDiv.textContent = "User Attributes";
    wrapperDiv.appendChild(labelDiv);
    var chevron = this._makeChevron();
    labelDiv.appendChild(chevron);

    var visibleInfoDiv = document.createElement("div");
    visibleInfoDiv.setAttribute(
      "class",
      "annotation__panel-group annotation__panel-border py-3 px-2 text-gray f2 mb-2"
    );
    wrapperDiv.appendChild(visibleInfoDiv);

    for (const attrName of visibleAttributes) {
      let checkbox = this._makeCheckbox(attrName);
      checkbox._checked = this._browserSettings.isAlwaysVisible(
        dataType,
        attrName
      );
      visibleInfoDiv.appendChild(checkbox);

      checkbox.addEventListener("change", () => {
        this._browserSettings.setAlwaysVisible(
          dataType,
          attrName,
          checkbox.getChecked()
        );
      });
    }

    labelDiv.addEventListener("click", (evt) => {
      visibleInfoDiv.hidden = !visibleInfoDiv.hidden;
      evt.target.classList.toggle("chevron-trigger-90");
    });

    return parentDiv;
  }

  /**
   *
   */
  _makeAttributeSections() {
    // Create the button tabs based on the available localization types.
    var parentDiv = this._typePageSelectDiv;
    var header = document.createElement("div");
    header.setAttribute("class", "py-3 f2 d-flex flex-items-center");
    header.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="no-fill mr-1" width="24" height="24" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
    </svg> Annotation Types`;
    parentDiv.appendChild(header);

    this._typePageButtons = {};
    var firstPageId = null;
    for (const [id, dataType] of Object.entries(this._dataTypeIdMap)) {
      var btn = document.createElement("button");
      btn.setAttribute("class", "tab-btn px-3 f2");
      btn.style.width = "250px";
      btn.style.height = "50px";
      btn.style.borderRadius = "0px";
      btn.style.marginLeft = "0px";
      btn.style.justifyContent = "space-between";

      var text = document.createElement("span");
      text.setAttribute("class", "px-2 text-white text-semibold");
      btn.appendChild(text);

      if (["box", "poly", "line", "dot"].includes(dataType.dtype)) {
        text.textContent = `${dataType.name} (${dataType.dtype})`;
      } else {
        text.textContent = `${dataType.name}`;
      }

      const svg = document.createElementNS(svgNamespace, "svg");
      svg.setAttribute("class", "icon-chevron-right");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("height", "1em");
      svg.setAttribute("width", "1em");
      btn.appendChild(svg);

      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute(
        "d",
        "M9.707 18.707l6-6c0.391-0.391 0.391-1.024 0-1.414l-6-6c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0z"
      );
      svg.appendChild(path);

      parentDiv.appendChild(btn);
      this._typePageButtons[id] = btn;

      if (firstPageId == null) {
        firstPageId = id;
      }
    }

    // Create a page for each localization type.
    // By default hide them, and use another function to display them.
    var parentDiv = this._typeAttributesDiv;

    this._typePages = {};
    for (const [id, dataType] of Object.entries(this._dataTypeIdMap)) {
      var pageDiv = this._makeAttributePage(parentDiv, dataType);
      this._typePages[id] = pageDiv;
      pageDiv.style.display = "none";
    }

    for (const [id, button] of Object.entries(this._typePageButtons)) {
      button.addEventListener("click", () => {
        button.blur();
        for (const [id2, pageDiv] of Object.entries(this._typePages)) {
          if (id2 == id) {
            pageDiv.style.display = "flex";
            this._typePageButtons[id2].classList.add("active");
          } else {
            pageDiv.style.display = "none";
            this._typePageButtons[id2].classList.remove("active");
          }
        }
      });
    }

    this._typePageButtons[firstPageId].click();
  }

  /**
   *
   */
  _createViewSettingsPage() {
    const parentWrapper = document.createElement("div");
    this._viewSettingsDiv.appendChild(parentWrapper);

    var headerDiv = document.createElement("div");
    headerDiv.setAttribute("class", "py-4 px-3 mb-3");
    parentWrapper.appendChild(headerDiv);

    var div = document.createElement("div");
    div.setAttribute("class", "h3");
    div.textContent = "List Appearance";
    headerDiv.appendChild(div);

    var span = document.createElement("span");
    span.setAttribute("class", "text-gray f2 py-1 d-flex");
    span.textContent =
      "Set the attributes' apperance settings of the registered media, localization, and state types in the annotator browser.";
    headerDiv.appendChild(span);

    var attrWrapper = document.createElement("div");
    attrWrapper.setAttribute("class", "d-flex flex-row");
    parentWrapper.appendChild(attrWrapper);

    this._typePageSelectDiv = document.createElement("div");
    this._typePageSelectDiv.setAttribute(
      "class",
      "d-flex flex-justify-center flex-column analysis__filter_main "
    );
    attrWrapper.appendChild(this._typePageSelectDiv);

    this._typeAttributesDiv = document.createElement("div");
    this._typeAttributesDiv.setAttribute(
      "class",
      "d-flex flex-wrap flex-column col-12 mr-3"
    );
    attrWrapper.appendChild(this._typeAttributesDiv);

    this._makeAttributeSections();
  }

  /**
   * @param {AnnotationBrowserSettings} browserSettings
   */
  init(browserSettings) {
    this._browserSettings = browserSettings;
    this._dataTypeIdMap = this._browserSettings.getDataTypeIdMap();
    this._createViewSettingsPage();
  }
}

customElements.define(
  "annotation-browser-settings-dialog",
  AnnotationBrowserSettingsDialog
);
