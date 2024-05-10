import { TatorElement } from "../components/tator-element.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { svgNamespace } from "../components/tator-element.js";
import { frameToTime } from "./annotation-common.js";
import { TimeStore } from "./time-store.js";

export class AttributePanel extends TatorElement {
  constructor() {
    super();

    this._widgets = [];

    this._topDiv = document.createElement("div");
    this._topDiv.setAttribute(
      "class",
      "d-flex flex-grow pt-4 rounded-2 flex-justify-right flex-items-center"
    );
    this._topDiv.style.display = "none";
    this._shadow.appendChild(this._topDiv);

    this._moreLessButton = document.createElement("div");
    this._moreLessButton.setAttribute("class", "f3 text-dark-gray mr-6");
    this._moreLessButton.style.cursor = "pointer";
    this._moreLessButton.textContent = "Less -";
    this._topDiv.appendChild(this._moreLessButton);

    this._trackDiv = document.createElement("div");
    this._trackDiv.setAttribute(
      "class",
      "annotation__panel-group py-2 text-gray f2"
    );
    this._trackDiv.style.display = "none";
    this._shadow.appendChild(this._trackDiv);

    this._standardWidgetsDiv = document.createElement("div");
    this._standardWidgetsDiv.setAttribute(
      "class",
      "annotation__panel-group pt-2 text-gray f2"
    );
    this._shadow.appendChild(this._standardWidgetsDiv);

    this._idWidget = document.createElement("text-input");
    this._idWidget.permission = "View Only";
    this._idWidget.setAttribute("name", "ID");
    this._standardWidgetsDiv.appendChild(this._idWidget);
    this._widgets.push(this._idWidget);

    this._frameWidget = document.createElement("text-input");
    this._frameWidget.permission = "View Only";
    this._frameWidget.setAttribute("name", "Frame");
    this._standardWidgetsDiv.appendChild(this._frameWidget);
    this._widgets.push(this._frameWidget);

    this._typeWidget = document.createElement("text-input");
    this._typeWidget.permission = "View Only";
    this._typeWidget.setAttribute("name", "Type");
    this._standardWidgetsDiv.appendChild(this._typeWidget);
    this._widgets.push(this._typeWidget);
    this._typeWidget.style.display = "none";

    this._elementalIdWidget = document.createElement("text-input");
    this._elementalIdWidget.permission = "View Only";
    this._elementalIdWidget.setAttribute("name", "Elemental ID");
    this._standardWidgetsDiv.appendChild(this._elementalIdWidget);
    this._widgets.push(this._elementalIdWidget);

    this._versionWidget = document.createElement("text-input");
    this._versionWidget.setAttribute("name", "Version");
    this._versionWidget.permission = "View Only";
    this._standardWidgetsDiv.appendChild(this._versionWidget);
    this._widgets.push(this._versionWidget);

    this._markWidget = document.createElement("text-input");
    this._markWidget.setAttribute("name", "Mark");
    this._markWidget.permission = "View Only";
    this._standardWidgetsDiv.appendChild(this._markWidget);
    this._widgets.push(this._markWidget);

    this._groupDiv = document.createElement("div");
    this._groupDiv.setAttribute(
      "class",
      "annotation__panel-group px-2 text-gray f2"
    );
    this._shadow.appendChild(this._groupDiv);

    this._builtInAttrLabel = document.createElement("div");
    this._builtInAttrLabel.setAttribute(
      "class",
      "f2 text-gray clickable pt-3 pb-1"
    );
    this._builtInAttrLabel.textContent = "Built-in Attributes";
    this._groupDiv.appendChild(this._builtInAttrLabel);

    this._builtInAttrsDiv = document.createElement("div");
    this._builtInAttrsDiv.setAttribute(
      "class",
      "annotation__panel-group annotation__panel-border py-2 px-2 text-gray f2"
    );
    this._groupDiv.appendChild(this._builtInAttrsDiv);

    this._parentAttrGroupDiv = document.createElement("div");
    this._parentAttrGroupDiv.setAttribute(
      "class",
      "d-flex flex-column px-4 mb-2"
    );
    this._groupDiv.appendChild(this._parentAttrGroupDiv);

    this._userDiv = document.createElement("div");
    this._userDiv.setAttribute(
      "class",
      "annotation__panel-group pb-3 text-gray f2"
    );
    this._shadow.appendChild(this._userDiv);
    this._emitChanges = true;

    this._innerDiv = document.createElement("div");
    this._innerDiv.setAttribute("class", "d-flex");
    this._shadow.appendChild(this._innerDiv);

    this._innerDiv1 = document.createElement("div");
    this._innerDiv1.setAttribute(
      "class",
      "d-flex flex-column text-gray f2 col-6"
    );
    this._innerDiv.appendChild(this._innerDiv1);

    this._innerDiv2 = document.createElement("div");
    this._innerDiv2.setAttribute(
      "class",
      "d-flex flex-column text-gray f2 col-6"
    );
    this._innerDiv2.style.marginLeft = "10px";
    this._innerDiv.appendChild(this._innerDiv2);

    this._attrColumns = 1;

    this._hiddenAttrLabel = document.createElement("div");
    this._hiddenAttrLabel.setAttribute("class", "f2 text-gray clickable py-2");
    this._hiddenAttrLabel.textContent = "Hidden Attributes";
    this._shadow.appendChild(this._hiddenAttrLabel);

    this._hiddenAttrsDiv = document.createElement("div");
    this._hiddenAttrsDiv.setAttribute(
      "class",
      "annotation__panel-group annotation__panel-border py-2 px-2 text-gray f2"
    );
    this._shadow.appendChild(this._hiddenAttrsDiv);

    this._builtInAttrLabel.appendChild(this._chevron());
    this._builtInAttrLabel.addEventListener("click", (evt) => {
      this._toggleAttributes(this._builtInAttrsDiv);
      this._toggleChevron(evt);
    });

    this._hiddenAttrLabel.appendChild(this._chevron());
    this._hiddenAttrLabel.addEventListener("click", (evt) => {
      this._toggleAttributes(this._hiddenAttrsDiv);
      this._toggleChevron(evt);
    });

    this._moreLessButton.addEventListener("click", () => {
      this._moreLessButton.blur();
      if (this._moreLessButton.textContent.includes("More")) {
        this.showMore();
      } else {
        this.showLess();
      }
    });

    this._builtInAttrLabel.hidden = true;
    this._builtInAttrsDiv.hidden = true;
    this._hiddenAttrLabel.hidden = true;
    this._hiddenAttrsDiv.hidden = true;

    // #TODO refactor this to tator-data
    this._userList = [];
    this._versionList = [];
    this._timeStore = null;
    this._browserSettings = null;
    this._disableWidgets = new Set();
    this._disableWidgets.add("Type");
  }

  static get observedAttributes() {
    return ["in-entity-browser"];
  }

  _chevron() {
    const chevron = document.createElementNS(svgNamespace, "svg");
    chevron.setAttribute("class", "chevron px-1");
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

  _toggleChevron(evt) {
    var el = evt.target;
    return el.classList.toggle("chevron-trigger-90");
  }

  _toggleAttributes(el) {
    let hidden = el.hidden;
    return (el.hidden = !hidden);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "in-entity-browser":
        this._userDiv.classList.add("px-4");
        this._standardWidgetsDiv.classList.add("px-4");
        this._groupDiv.classList.add("px-4");
    }
  }

  /**
   * @param {AnnotationBrowserSettings} val
   */
  set browserSettings(val) {
    this._browserSettings = val;

    // It's possible that this wasn't done when the dataType was loaded.
    // So this is perform redundantly.
    if (this._dataType) {
      let moreLessToggle = this._browserSettings.getMoreLess(this._dataType);
      if (moreLessToggle == "more") {
        this.showMore();
      } else if (moreLessToggle == "less") {
        this.showLess();
      }
    }
  }

  /**
   * @param {Number} val - 1 or 2 are valid. This will set how many columns to display for
   *                       the user defined attributes.
   */
  set attributeColumns(val) {
    this._attrColumns = val;
  }

  set permission(val) {
    this._permission = val;
    for (const widget of this._widgets) {
      // Specific attribute fields in this panel are always disabled
      if (
        widget.getAttribute("name") != "ID" &&
        widget.getAttribute("name") != "Frame" &&
        widget.getAttribute("name") != "Type" &&
        widget.getAttribute("name") != "Version"
      ) {
        // Widget may have been marked as disabled, and its permission have already been
        // set appropriately.
        if (!widget.disabled) {
          widget.permission = val;
        }
      }
    }
  }

  /**
   * @param {Tator.Media} media - Media associated with localization. Optional and only useful
   *                              with the built in attributes.
   *
   * @param {Tator.MediaType} mediaType - Media type associated with media param
   *
   * Execute this prior to setting the dataType of this attribute panel. This will ensure
   * that the widgets that utilize this are created.
   */
  setAssociatedMedia(media, mediaType) {
    this._associatedMedia = media;
    this._associatedMediaType = mediaType;

    if (mediaType.dtype == "video") {
      this._timeStore = new TimeStore(
        this._associatedMedia,
        this._associatedMediaType
      );
    } else if (mediaType.dtype == "image") {
      this._frameWidget.style.display = "none";
    }
  }

  /**
   * Adds the fields common across all localization and state types
   */
  _addCommonBuiltInAttributes() {
    var widget;

    widget = document.createElement("text-input");
    widget.setAttribute("name", "Created By");
    widget.permission = "View Only";
    this._builtInAttrsDiv.appendChild(widget);

    widget = document.createElement("text-input");
    widget.setAttribute("name", "Created Datetime");
    widget.permission = "View Only";
    this._builtInAttrsDiv.appendChild(widget);

    widget = document.createElement("text-input");
    widget.setAttribute("name", "Modified By");
    widget.permission = "View Only";
    this._builtInAttrsDiv.appendChild(widget);

    widget = document.createElement("text-input");
    widget.setAttribute("name", "Modified Datetime");
    widget.permission = "View Only";
    this._builtInAttrsDiv.appendChild(widget);

    if (this._timeStore) {
      widget = document.createElement("text-input");
      widget.setAttribute("name", "Video Time");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      if (this._timeStore.utcEnabled()) {
        widget = document.createElement("text-input");
        widget.setAttribute("name", "UTC Time");
        widget.permission = "View Only";
        this._builtInAttrsDiv.appendChild(widget);
      }
    }
  }

  /**
   * @precondition frameWidget must have been set
   * @precondition timeStore must have been set for relative time / UTC time to pop up
   * @precondtion associatedMedia must have been set to apply pixel information
   */
  _setBuiltInAttributes(values) {
    var frame = parseInt(this._frameWidget.getValue());

    for (const widget of this._builtInAttrsDiv.children) {
      const name = widget.getAttribute("name");

      if (name == "Created By") {
        let userKey = "created_by";
        if (values.created_by == null) {
          userKey = "user";
        }

        let username = null;
        let foundUser = false;
        for (let index = 0; index < this._userList.length; index++) {
          if (this._userList[index].result.id == values[userKey]) {
            foundUser = true;
            username = this._userList[index].result.username;
            break;
          }
        }

        if (!foundUser) {
          this._getUsername(values[userKey], widget);
        } else {
          widget.setValue(username);
        }
      } else if (name == "Created Datetime") {
        widget.setValue(values.created_datetime);
      } else if (name == "Modified By") {
        let username = null;
        let foundUser = false;
        for (let index = 0; index < this._userList.length; index++) {
          if (this._userList[index].result.id == values.modified_by) {
            foundUser = true;
            username = this._userList[index].result.username;
            break;
          }
        }

        if (!foundUser) {
          this._getUsername(values.modified_by, widget);
        } else {
          widget.setValue(username);
        }
      } else if (name == "Modified Datetime") {
        widget.setValue(values.modified_datetime);
      } else if (name == "Video Time") {
        widget.setValue(this._timeStore.getRelativeTimeFromFrame(frame));
      } else if (name == "UTC Time") {
        widget.setValue(this._timeStore.getAbsoluteTimeFromFrame(frame));
      } else if (name == "x") {
        if (values.x != undefined) {
          let val = `${values.x.toFixed(4)}`;
          if (
            this._associatedMedia &&
            this._associatedMediaType.dtype != "multi"
          ) {
            val += ` | ${Math.round(
              values.x * this._associatedMedia.width
            )} px`;
          }
          widget.setValue(val);
        }
      } else if (name == "y") {
        if (values.y != undefined) {
          let val = `${values.y.toFixed(4)}`;
          if (
            this._associatedMedia &&
            this._associatedMediaType.dtype != "multi"
          ) {
            val += ` | ${Math.round(
              values.y * this._associatedMedia.height
            )} px`;
          }
          widget.setValue(val);
        }
      } else if (name == "u") {
        if (values.u != undefined) {
          let val = `${values.u.toFixed(4)}`;
          if (
            this._associatedMedia &&
            this._associatedMediaType.dtype != "multi"
          ) {
            val += ` | ${Math.round(
              values.u * this._associatedMedia.width
            )} px`;
          }
          widget.setValue(val);
        }
      } else if (name == "v") {
        if (values.v != undefined) {
          let val = `${values.v.toFixed(4)}`;
          if (
            this._associatedMedia &&
            this._associatedMediaType.dtype != "multi"
          ) {
            val += ` | ${Math.round(
              values.v * this._associatedMedia.height
            )} px`;
          }
          widget.setValue(val);
        }
      } else if (name == "Line Length") {
        let lineL2norm = Math.sqrt(
          Math.pow((values.x - (values.x + values.u)) * 1, 2) +
            Math.pow((values.y - (values.y + values.v)) * 1, 2)
        );
        let val = `${lineL2norm.toFixed(4)}`;

        if (
          this._associatedMedia &&
          this._associatedMediaType.dtype != "multi"
        ) {
          let lineL2norm_pixels = Math.sqrt(
            Math.pow(
              (values.x - (values.x + values.u)) * this._associatedMedia.width,
              2
            ) +
              Math.pow(
                (values.y - (values.y + values.v)) *
                  this._associatedMedia.height,
                2
              )
          );
          val += ` | ${lineL2norm_pixels.toFixed(4)} px`;
        }
        widget.setValue(val);
      } else if (name == "Box Width") {
        if (values.width != undefined) {
          let val = `${values.width.toFixed(4)}`;
          if (
            this._associatedMedia &&
            this._associatedMediaType.dtype != "multi"
          ) {
            val += ` | ${Math.round(
              values.width * this._associatedMedia.width
            )} px`;
          }
          widget.setValue(val);
        }
      } else if (name == "Box Height") {
        if (values.height != undefined) {
          let val = `${values.height.toFixed(4)}`;
          if (
            this._associatedMedia &&
            this._associatedMediaType.dtype != "multi"
          ) {
            val += ` | ${Math.round(
              values.height * this._associatedMedia.height
            )} px`;
          }
          widget.setValue(val);
        }
      }
    }
  }

  _setHiddenAttributes(values) {
    for (const widget of this._hiddenAttrsDiv.children) {
      const name = widget.getAttribute("name");
      const value = values.attributes[name];
      // Only set the name if it is defined
      if (value != undefined) {
        widget.setValue(values.attributes[name]);
      }
    }
  }

  _removeBuiltInAttributes() {
    while (this._builtInAttrsDiv.children.length > 0) {
      this._builtInAttrsDiv.removeChild(this._builtInAttrsDiv.lastChild);
    }
  }

  _removeHiddenAttributes() {
    while (this._hiddenAttrsDiv.children.length > 0) {
      this._hiddenAttrsDiv.removeChild(this._hiddenAttrsDiv.lastChild);
    }
  }

  set enableBuiltInAttributes(val) {
    this._enableBuiltInAttributes = val;
  }

  set enableHiddenAttributes(val) {
    this._enableHiddenAttributes = val;
  }

  set dataType(val) {
    this._dataType = val;
    this._widgets = [];

    // Remove existing attribute widgets.
    while (this._userDiv.firstChild) {
      this._userDiv.removeChild(this._userDiv.firstChild);
    }
    while (this._trackDiv.firstChild) {
      this._trackDiv.removeChild(this._trackDiv.firstChild);
    }

    this._removeBuiltInAttributes();
    this._removeHiddenAttributes();

    if (val.isTrack) {
      const div = document.createElement("div");
      div.setAttribute("class", "annotation__panel-group px-4 text-gray f2");
      this._trackDiv.appendChild(div);
      this._trackDiv.style.display = "block";

      var sliderDiv = document.createElement("div");
      sliderDiv.setAttribute(
        "class",
        "d-flex flex-items-center flex-justify-between py-1"
      );
      div.appendChild(sliderDiv);

      this._slider = document.createElement("input");
      this._slider.setAttribute("class", "range flex-grow");
      this._slider.setAttribute("type", "range");
      this._slider.setAttribute("step", "1");
      this._slider.setAttribute("value", "0");
      sliderDiv.appendChild(this._slider);

      this._slider.addEventListener("input", () => {
        if (this._emitChanges) {
          this.dispatchEvent(
            new CustomEvent("trackSliderInput", {
              detail: {
                frame: this._frames[this._slider.value],
                track: this._track,
              },
              composed: true,
            })
          );
        }
      });
      this._slider.addEventListener("change", () => {
        if (this._emitChanges) {
          this.dispatchEvent(
            new CustomEvent("trackSliderChange", {
              detail: {
                frame: this._frames[this._slider.value],
                track: this._track,
              },
              composed: true,
            })
          );
        }
      });
      this.displaySlider(false);

      var goToLocalizationDiv = document.createElement("div");
      goToLocalizationDiv.setAttribute(
        "class",
        "d-flex flex-items-center py-1"
      );
      goToLocalizationDiv.style.marginTop = "16px";
      div.appendChild(goToLocalizationDiv);
      this._goToLocalization = goToLocalizationDiv;

      var label = document.createElement("legend");
      this._goToLocalizationLabel = label;
      goToLocalizationDiv.append(label);

      var goToLocalizationButton = document.createElement(
        "entity-detection-button"
      );
      goToLocalizationButton.style.marginLeft = "16px";
      goToLocalizationDiv.appendChild(goToLocalizationButton);
      goToLocalizationButton.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("goToLocalization", {
            detail: {
              track: this._track,
              frame: this._frames[this._slider.value],
            },
            composed: true,
          })
        );
      });
      this.displayGoToLocalization(false);

      this._currentFrame = 0;
    } else {
      const div = document.createElement("div");
      div.setAttribute("class", "annotation__panel-group px-4 text-gray f2");
      this._trackDiv.appendChild(div);
      this._trackDiv.style.display = "block";

      var goToTrackDiv = document.createElement("div");
      goToTrackDiv.setAttribute("class", "d-flex flex-items-center py-1");
      this._goToTrack = div;
      div.appendChild(goToTrackDiv);

      var label = document.createElement("legend");
      this._goToTrackLabel = label;
      goToTrackDiv.append(label);

      var goToTrackButton = document.createElement("entity-track-button");
      goToTrackButton.style.marginLeft = "16px";
      goToTrackButton.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("goToTrack", {
            detail: { track: this._associatedTrack },
            composed: true,
          })
        );
      });
      goToTrackDiv.appendChild(goToTrackButton);
      this.displayGoToTrack(false);
    }

    // Built-in attributes
    if (val.dtype == "box") {
      this._addCommonBuiltInAttributes();

      let widget = document.createElement("text-input");
      widget.setAttribute("name", "x");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      widget = document.createElement("text-input");
      widget.setAttribute("name", "y");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      widget = document.createElement("text-input");
      widget.setAttribute("name", "Box Width");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      widget = document.createElement("text-input");
      widget.setAttribute("name", "Box Height");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);
    } else if (val.dtype == "line") {
      this._addCommonBuiltInAttributes();

      let widget = document.createElement("text-input");
      widget.setAttribute("name", "x");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      widget = document.createElement("text-input");
      widget.setAttribute("name", "y");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      widget = document.createElement("text-input");
      widget.setAttribute("name", "u");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      widget = document.createElement("text-input");
      widget.setAttribute("name", "v");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      widget = document.createElement("text-input");
      widget.setAttribute("name", "Line Length");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);
    } else if (val.dtype == "dot") {
      this._addCommonBuiltInAttributes();

      let widget = document.createElement("text-input");
      widget.setAttribute("name", "x");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);

      widget = document.createElement("text-input");
      widget.setAttribute("name", "y");
      widget.permission = "View Only";
      this._builtInAttrsDiv.appendChild(widget);
    }

    const allSortedAttrTypes = val.attribute_types.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    // Grouped attributes
    // - Gather up the attribute names in the group
    // - Create the parent div/label the widgets will be attached to
    var allGroupedAttrNames = [];
    var attrGroups = [];
    for (const attrType of allSortedAttrTypes) {
      if (attrType.style != null) {
        if (attrType.style.includes("attr_group")) {
          const labelDiv = document.createElement("div");
          labelDiv.setAttribute(
            "class",
            "f2 text-gray text-semibold clickable py-2"
          );
          labelDiv.textContent = attrType.name;
          this._parentAttrGroupDiv.appendChild(labelDiv);

          const infoDiv = document.createElement("div");
          infoDiv.setAttribute(
            "class",
            "annotation__panel-group annotation__panel-border py-3 px-2 text-gray f2 mb-2"
          );
          this._parentAttrGroupDiv.appendChild(infoDiv);

          const tokens = attrType.default.split("|");

          const groupInfo = {
            name: attrType.name,
            attrNames: tokens,
            labelDiv: labelDiv,
            infoDiv: infoDiv,
          };

          labelDiv.appendChild(this._chevron());
          labelDiv.addEventListener("click", (evt) => {
            this._toggleAttributes(groupInfo.infoDiv);
            this._toggleChevron(evt);
          });

          attrGroups.push(groupInfo);
          allGroupedAttrNames.push(...tokens);

          if (attrType.style.includes("minimized")) {
            this._toggleAttributes(groupInfo.infoDiv);
          }
        }
      }
    }

    // Default div area where attributes go

    // User defined attributes
    var columnIdx = 0;
    for (const column of allSortedAttrTypes) {
      columnIdx += 1;
      let widget;
      var ignorePermission = false;

      if (column.dtype == "bool") {
        widget = document.createElement("bool-input");
        widget.setAttribute("name", column.name);
        widget.setAttribute("on-text", "Yes");
        widget.setAttribute("off-text", "No");
        if (column.style) {
          const style_options = column.style.split(" ");
          if (style_options.includes("disabled")) {
            widget.permission = "View Only";
            widget.disabled = true;
            ignorePermission = true;
          }
          widget.setStyle(column.style);
        }
      } else if (column.dtype == "enum") {
        widget = document.createElement("enum-input");
        widget.setAttribute("name", column.name);
        let choices = [];
        for (let idx = 0; idx < column.choices.length; idx++) {
          let choice = { value: column.choices[idx] };
          if (column.labels) {
            choice.label = column.labels[idx];
          }
          choices.push(choice);
        }
        widget.choices = choices;
        if (column.style) {
          const style_options = column.style.split(" ");
          if (style_options.includes("disabled")) {
            widget.permission = "View Only";
            widget.disabled = true;
            ignorePermission = true;
          }
          widget.setStyle(column.style);
        }
      } else if (column.dtype == "datetime") {
        try {
          widget = document.createElement("datetime-input");
          widget.setAttribute("name", column.name);
        } catch (e) {
          console.log(e.description);
        }

        if (
          (widget && widget._input && widget._input.type == "text") ||
          !widget._input
        ) {
          console.log(
            "No browser support for datetime, or error. Degrading to text-input."
          );
          widget = document.createElement("text-input");
          widget.setAttribute("name", column.name);
          widget.setAttribute("type", column.dtype);
          widget.autocomplete = column.autocomplete;
        }
        //widget.autocomplete = column.autocomplete; #TODO can this use autocomplete?
        if (column.style) {
          const style_options = column.style.split(" ");
          if (style_options.includes("disabled")) {
            widget.permission = "View Only";
            widget.disabled = true;
            ignorePermission = true;
          }
          widget.setStyle(column.style);
        }
      } else if (column.style) {
        const style_options = column.style.split(" ");
        if (column.dtype == "string" && style_options.includes("long_string")) {
          widget = document.createElement("text-area");
          widget.setAttribute("name", column.name);
          widget.setAttribute("type", column.dtype);
        } else {
          widget = document.createElement("text-input");
          widget.setAttribute("name", column.name);
          widget.setAttribute("type", column.dtype);
          widget.autocomplete = column.autocomplete;
        }

        if (style_options.includes("disabled")) {
          widget.permission = "View Only";
          widget.disabled = true;
          ignorePermission = true;
        }

        widget.setStyle(column.style);
      } else {
        // TODO: Implement a better geopos widget
        widget = document.createElement("text-input");
        widget.setAttribute("name", column.name);
        widget.setAttribute("type", column.dtype);
        widget.autocomplete = column.autocomplete;
      }

      // Set whether this widget is required
      if (typeof column.required === "undefined") {
        widget.required = false;
      } else {
        widget.required = column.required;
      }

      // Show description hover text (if existing)
      if (
        typeof column.description !== "undefined" &&
        column.description !== ""
      ) {
        widget.setAttribute("title", column.description);
      } //else {
      //widget.setAttribute("title", `Accepts "${column.dtype}" data input`);
      //}

      if (typeof this._permission !== "undefined" && !ignorePermission) {
        widget.permission = this._permission;
      }

      if (column.order < 0) {
        this._hiddenAttrsDiv.appendChild(widget);
      } else if (allGroupedAttrNames.includes(column.name)) {
        for (const groupInfo of attrGroups) {
          if (groupInfo.attrNames.includes(column.name)) {
            groupInfo.infoDiv.appendChild(widget);
          }
        }
      } else {
        if (this._attrColumns == 2) {
          if (columnIdx / allSortedAttrTypes.length > 0.5) {
            this._innerDiv1.appendChild(widget);
          } else {
            this._innerDiv2.appendChild(widget);
          }
        } else {
          this._userDiv.appendChild(widget);
        }
      }

      if (column.default) {
        widget.default = column.default;
      }
      widget.reset();

      widget.addEventListener("change", () => {
        if (this._emitChanges) {
          this.dispatchEvent(new Event("change"));
        }
      });

      if (column.visible == false) {
        this._disableWidgets.add(column.name);
        widget.style.display = "none";
      }

      this._widgets.push(widget);
    }

    if (
      this._enableBuiltInAttributes &&
      this._builtInAttrsDiv.children.length > 0
    ) {
      this._builtInAttrLabel.hidden = false;
      this._builtInAttrsDiv.hidden = true;
    } else {
      this._builtInAttrLabel.hidden = true;
      this._builtInAttrsDiv.hidden = true;
    }

    if (
      this._enableHiddenAttributes &&
      this._hiddenAttrsDiv.children.length > 0
    ) {
      this._hiddenAttrLabel.hidden = false;
      this._hiddenAttrsDiv.hidden = true;
    } else {
      this._hiddenAttrLabel.hidden = true;
      this._hiddenAttrsDiv.hidden = true;
    }

    if (this._browserSettings) {
      let moreLessToggle = this._browserSettings.getMoreLess(this._dataType);
      if (moreLessToggle == "more") {
        this.showMore();
      } else if (moreLessToggle == "less") {
        this.showLess();
      }
    }
  }

  getValues() {
    let values = {};
    for (const widget of this._widgets) {
      if (
        widget.getAttribute("name") != "ID" &&
        widget.getAttribute("name") != "Created By" &&
        widget.getAttribute("name") != "Version"
      ) {
        const val = widget.getValue();
        if (val === null && widget.required) {
          values = null;
          break;
        } else if (val !== null) {
          values[widget.getAttribute("name")] = val;
        }
      }
    }
    return values;
  }

  setFrame(frame) {
    this._currentFrame = frame;
    let sliderData = {};
    sliderData.currentFrame = this._currentFrame;
    this.setSlider(sliderData);
  }

  /**
   * @param {boolean} display - True to display it. False to hide it.
   */
  displayGoToLocalization(display) {
    if (this._goToLocalization) {
      if (display) {
        this._goToLocalization.style.display = "flex";
      } else {
        this._goToLocalization.style.display = "none";
      }
    }
  }

  /**
   * @param {boolean} display - True to display it. False to hide it.
   */
  displayGoToTrack(display) {
    if (this._goToTrack) {
      if (display) {
        this._goToTrack.style.display = "flex";
      } else {
        this._goToTrack.style.display = "none";
      }
    }
  }

  displaySlider(display) {
    if (this._slider) {
      if (display) {
        this._slider.style.display = "block";
      } else {
        this._slider.style.display = "none";
      }
    }
  }

  displayTrackUI(display) {
    if (this._trackDiv) {
      if (display) {
        this._trackDiv.style.display = "block";
      } else {
        this._trackDiv.style.display = "none";
      }
    }
  }

  setSlider(data) {
    // If there's no slider as a part of this panel, then just ignored this call.
    if (!this._slider) {
      return;
    }

    // Set the slider max and corresponding frame index list if
    // the track frame segments are provided (which are start/end pairs)
    if (data.segments) {
      this._trackSegments = data.segments;
      this._frames = [];
      for (const [start, end] of data.segments) {
        for (let i = start; i <= end; i++) {
          this._frames.push(i);
        }
      }
      this._slider.max = this._frames.length - 1;
      this._frame_max = 0;
      for (const frame of this._frames) {
        if (frame > this._frame_max) {
          this._frame_max = frame;
        }
      }
    }

    // Set the current value of the slider based on the provided frame
    // If no frame is provided, then just pick the beginning
    if (data.currentFrame && this._frames) {
      let slider_index = this._frames.indexOf(data.currentFrame);

      // Current frame is not part of this track's frameset. Set the slider
      // based on the current frame number by picking the closest entry
      // (without going over)
      if (slider_index == -1) {
        for (let i = 0; i < this._frames.length; i++) {
          if (this._frames[i] <= data.currentFrame) {
            slider_index = i;
          }
        }
      }

      this._slider.value = slider_index;
    } else {
      this._slider.value = 0;
    }

    this.displaySlider(true);
  }

  _getUsername(userId, widget) {
    if (userId) {
      fetchCredentials("/rest/User/" + userId)
        .then((response) => {
          return response.json();
        })
        .then((result) => {
          this._userList.push({ result });
          widget.setValue(result.username);
        });
    }
  }

  _getVersion(versionId, widget) {
    if (versionId) {
      fetchCredentials("/rest/Version/" + versionId)
        .then((response) => {
          return response.json();
        })
        .then((result) => {
          this._versionList.push({ result });
          widget.setValue(result.name);
        });
    }
  }

  /**
   * @param {string} val - "ID" | "Frame" | "Version" for the built-in attributes
   */
  disableWidget(val) {
    this._disableWidgets.add(val);
    if (val == "ID") {
      this._idWidget.style.display = "none";
    }
    if (val == "Frame") {
      this._frameWidget.style.display = "none";
    }
    if (val == "Type") {
      this._typeWidget.style.display = "none";
    }
    if (val == "Version") {
      this._versionWidget.style.display = "none";
    }
    if (val == "Mark") {
      this._markWidget.style.display = "none";
    }
    if (val == "Elemental ID") {
      this._elementalIdWidget.style.display = "none";
    }
  }

  showHeader() {
    this._topDiv.style.display = "flex";
  }

  showMore() {
    for (const widget of this._widgets) {
      if (!this._disableWidgets.has(widget.getAttribute("name"))) {
        widget.style.display = "block";
      }
    }
    this._groupDiv.style.display = "block";

    if (!this._disableWidgets.has("ID")) {
      this._idWidget.style.display = "block";
    }
    if (!this._disableWidgets.has("Elemental ID")) {
      this._elementalIdWidget.style.display = "block";
    }
    if (!this._disableWidgets.has("Type")) {
      this._typeWidget.style.display = "block";
    }
    if (!this._disableWidgets.has("Frame")) {
      this._frameWidget.style.display = "block";
    }
    if (!this._disableWidgets.has("Version")) {
      this._versionWidget.style.display = "block";
    }
    if (!this._disableWidgets.has("Mark")) {
      this._markWidget.style.display = "block";
    }

    this._moreLessButton.textContent = "Less -";
    this._browserSettings.setMoreLess(this._dataType, "more");
  }

  showLess() {
    for (const widget of this._widgets) {
      widget.style.display = "none";
      if (this._browserSettings) {
        const attrName = widget.getAttribute("name");
        if (this._browserSettings.isAlwaysVisible(this._dataType, attrName)) {
          widget.style.display = "block";
        }
      }
    }
    this._groupDiv.style.display = "none";

    var standardWidgets = [
      { attrName: "ID", widget: this._idWidget },
      { attrName: "Elemental ID", widget: this._elementalIdWidget },
      { attrName: "Frame", widget: this._frameWidget },
      { attrName: "Type", widget: this._typeWidget },
      { attrName: "Version", widget: this._versionWidget },
      { attrName: "Mark", widget: this._markWidget },
    ];
    for (const info of standardWidgets) {
      var attrName = info["attrName"];
      var widget = info["widget"];
      widget.style.display = "none";
      if (!this._disableWidgets.has(attrName) && this._browserSettings) {
        if (this._browserSettings.isAlwaysVisible(this._dataType, attrName)) {
          widget.style.display = "block";
        }
      }
    }

    this._moreLessButton.textContent = "More +";
    this._browserSettings.setMoreLess(this._dataType, "less");
  }

  /**
   * Sets frame range if there are attributes with "start_frame"
   * and "end_frame" associated with it
   *
   * #TODO Should probably refactor finding the widget and setting the value
   */
  setFrameRange(startFrame, endFrame) {
    for (const attr of this._dataType.attribute_types) {
      if (attr.style === "start_frame") {
        for (const widget of this._widgets) {
          const name = widget.getAttribute("name");
          if (name == attr.name) {
            widget.setValue(startFrame);
            break;
          }
        }
      } else if (attr.style === "end_frame") {
        for (const widget of this._widgets) {
          const name = widget.getAttribute("name");
          if (name == attr.name) {
            widget.setValue(endFrame);
            break;
          }
        }
      }
    }
  }

  setValues(values, associatedTrack, associatedTrackType) {
    // Set the ID widget
    this._idWidget.setValue(values.id);
    this._elementalIdWidget.setValue(values.elemental_id);
    this._markWidget.setValue(values.mark);
    this._frameWidget.setValue(values.frame);
    this._typeWidget.setValue(
      `${this._dataType.name} (ID: ${this._dataType.id})`
    );

    let version = null;
    let foundVersion = false;
    for (let index = 0; index < this._versionList.length; index++) {
      if (this._versionList[index].result.id == values.version) {
        foundVersion = true;
        version = this._versionList[index].result.name;
        break;
      }
    }

    if (!foundVersion) {
      this._getVersion(values.version, this._versionWidget);
    } else {
      this._versionWidget.setValue(version);
    }

    // Check if the slider needs to be updated if there's different track data now.
    // If so, then update it.
    let trackSegmentsUpdated = false;
    if (this._trackSegments && values.segments) {
      trackSegmentsUpdated = this._trackSegments != values.segments;
    }

    // Skip resetting slider if we already display this track
    if (this._track && this._track.id == values.id && !trackSegmentsUpdated) {
      return;
    }

    this._emitChanges = false;

    // only relevant if we are dealing with objects
    // with ids
    if (this._dataType.isTrack) {
      this._track = values;
    }

    let sliderData = {};
    sliderData.segments = values.segments;
    sliderData.currentFrame = this._currentFrame;
    this.setSlider(sliderData);

    // If the provided values contain a track association ID, then display
    // the go to track button. Otherwise, hide it.
    this.displayGoToTrack(false);
    this.displayGoToLocalization(false);
    if (associatedTrack != undefined && associatedTrackType != undefined) {
      this._goToTrackLabel.textContent =
        "View Associated " + associatedTrackType.name;
      this._associatedTrack = associatedTrack;
      this.displayGoToTrack(true);
    } else if (this._dataType.isTrack) {
      this._goToLocalizationLabel.textContent = "View Associated Localization";
      this.displayGoToLocalization(true);
    }

    var widgets;
    if (this._attrColumns == 2) {
      widgets = [...this._innerDiv1.children, ...this._innerDiv2.children];
    } else {
      widgets = this._widgets;
    }

    for (const widget of widgets) {
      const name = widget.getAttribute("name");
      const value = values.attributes[name];
      // Only set the name if it is defined
      if (value != undefined) {
        widget.setValue(values.attributes[name]);
      } else if (!["ID", "Frame", "Version"].includes(name)) {
        widget.reset();
      }
    }

    this._setBuiltInAttributes(values);
    this._setHiddenAttributes(values);

    this._emitChanges = true;
    this.dispatchEvent(new Event("values-set"));
  }

  reset() {
    // Sets all widgets to default
    for (const widget of this._widgets) {
      widget.reset();
    }
  }
}

if (!customElements.get("attribute-panel")) {
  customElements.define("attribute-panel", AttributePanel);
}
