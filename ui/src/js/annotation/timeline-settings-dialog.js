import { ModalDialog } from "../components/modal-dialog.js";
import { svgNamespace } from "../components/tator-element.js";

export class TimelineSettingsDialog extends ModalDialog {
  constructor() {
    super();

    this._header.classList.remove("py-6");
    this._header.classList.add("py-3");
    this._main.classList.remove("px-6");
    this._main.classList.add("px-3");
    this._main.classList.remove("px-4");
    this._main.classList.add("py-3");

    this._viewSettingsDiv = document.createElement("div");
    this._viewSettingsDiv.setAttribute("class", "d-flex flex-column");
    this._main.appendChild(this._viewSettingsDiv);

    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._title.nodeValue = "Timeline Settings";
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
    div.textContent = "Attribute Apperance";
    headerDiv.appendChild(div);

    var span = document.createElement("span");
    span.setAttribute("class", "text-gray f2 py-1 d-flex");
    span.textContent =
      "Set the color for each attribute when displayed on the entity timeline. Attributes can be hidden.";
    headerDiv.appendChild(span);

    var infoDiv = document.createElement("div");
    infoDiv.setAttribute(
      "class",
      "d-flex flex-grow flex-column col-12 annotation_browser_settings_wrapper"
    );
    parentWrapper.appendChild(infoDiv);

    var table = document.createElement("table");
    table.setAttribute(
      "class",
      "f2 text-gray timeline-settings-view-table box-border"
    );
    infoDiv.appendChild(table);

    var thead = document.createElement("thead");
    thead.setAttribute("class", "text-white text-semibold f2");
    table.appendChild(thead);

    var trHead = document.createElement("tr");
    thead.appendChild(trHead);

    var th = document.createElement("th");
    th.setAttribute("class", "py-2 no-vertical-border col-6");
    th.textContent = "Attribute";
    trHead.appendChild(th);

    th = document.createElement("th");
    th.setAttribute("class", "py-2 no-vertical-border col-3");
    th.textContent = "Color";
    trHead.appendChild(th);

    th = document.createElement("th");
    th.setAttribute("class", "py-2 no-vertical-border col-3");
    th.textContent = "Visible";
    trHead.appendChild(th);

    var tbody = document.createElement("tbody");
    table.appendChild(tbody);

    // Order shown in entity-timeline is:
    // Selected localization (ignoring)
    // Frame-associated state bools
    // States with attribute-based range
    // Frame-associated state floats/ints
    var graphEntries = [];

    const boolStates = this._timelineSettings.getFrameBooleanInfo();
    graphEntries.push(...boolStates);
    const attrStates = this._timelineSettings.getAttrRangeInfo();
    graphEntries.push(...attrStates);
    const numericalStates = this._timelineSettings.getFrameNumericalInfo();
    graphEntries.push(...numericalStates);

    var availableColors = [
      { value: "#797991", label: "Default" },
      { value: "#40e0d0", label: "Teal" },
      { value: "#1b9ffb", label: "Blue" },
      { value: "#4A4EAE", label: "Blue Iris" },
      { value: "#696cff", label: "Slate Blue" },
      { value: "#FF69B4", label: "Pink" },
      { value: "#DB7093", label: "Mauve" },
      { value: "#85d81d", label: "Green" },
      { value: "#03c04a", label: "Parakeet Green" },
      { value: "#00755e", label: "Rainforest Green" },
      { value: "#FFAD00", label: "Orange" },
      { value: "#ff6969", label: "Coral" },
      { value: "#ff3e1d", label: "Red" },
    ];

    for (const entry of graphEntries) {
      const colorEnum = document.createElement("select");
      colorEnum.setAttribute(
        "class",
        "form-select has-border select-sm text-semibold"
      );
      for (const colorInfo of availableColors) {
        var option = document.createElement("option");
        option.setAttribute("value", colorInfo.value);
        option.style.backgroundColor = colorInfo.value;
        option.textContent = colorInfo.label;
        colorEnum.appendChild(option);
      }
      colorEnum.setAttribute("attrName", entry.name);
      colorEnum.setAttribute("dataTypeID", entry.dataType.id);
      colorEnum.style.color = "#FFFFFF"; // White
      colorEnum.style.backgroundColor = availableColors[0].value;

      for (let option of colorEnum.options) {
        var attrName = colorEnum.getAttribute("attrName");
        var dataTypeId = colorEnum.getAttribute("dataTypeId");
        var selectedColor = option.getAttribute("value");
        if (
          attrName == entry.name &&
          dataTypeId == entry.dataType.id &&
          selectedColor == entry.color
        ) {
          option.selected = true;
          colorEnum.style.backgroundColor = entry.color;
          break;
        }
      }

      colorEnum.addEventListener("change", () => {
        for (let option of colorEnum.options) {
          if (option.selected) {
            var attrName = colorEnum.getAttribute("attrName");
            var dataTypeId = colorEnum.getAttribute("dataTypeId");
            var selectedColor = option.getAttribute("value");
            colorEnum.style.backgroundColor = selectedColor;
            this._timelineSettings.setColor(
              dataTypeId,
              attrName,
              selectedColor
            );
            this.dispatchEvent(
              new CustomEvent("settingsChanged", { composed: true })
            );
          }
        }
      });

      const viewable = document.createElement("bool-input");
      viewable.setAttribute("on-text", "On");
      viewable.setAttribute("off-text", "Off");
      viewable._legend.style.display = "none";
      viewable._controls.classList.remove("col-8");
      viewable._controls.classList.add("col-12");
      viewable.setValue(entry.visible);
      viewable.setAttribute("attrName", entry.name);
      viewable.setAttribute("dataTypeID", entry.dataType.id);

      viewable.addEventListener("change", () => {
        var attrName = viewable.getAttribute("attrName");
        var dataTypeId = viewable.getAttribute("dataTypeId");
        this._timelineSettings.setVisible(
          dataTypeId,
          attrName,
          viewable.getValue()
        );
        this.dispatchEvent(
          new CustomEvent("settingsChanged", { composed: true })
        );
      });

      var trData = document.createElement("tr");
      tbody.appendChild(trData);

      var td;

      td = document.createElement("td");
      td.setAttribute("class", "py-2 no-vertical-border");
      td.innerHTML = entry.name;
      trData.appendChild(td);

      td = document.createElement("td");
      td.setAttribute("class", "py-2 no-vertical-border");
      td.appendChild(colorEnum);
      trData.appendChild(td);

      td = document.createElement("td");
      td.setAttribute("class", "py-2 no-vertical-border");
      td.appendChild(viewable);
      trData.appendChild(td);
    }
  }

  /**
   * This kicks off the UI creation
   * @param {TimelineSettings} timelineSettings - Initialized settings that will be used to populate
   *                                              this dialog
   */
  init(timelineSettings) {
    this._timelineSettings = timelineSettings;
    this._createViewSettingsPage();
  }
}

customElements.define("timeline-settings-dialog", TimelineSettingsDialog);
