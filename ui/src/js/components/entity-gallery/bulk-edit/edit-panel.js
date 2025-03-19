import { TatorElement } from "../../tator-element.js";
import { svgNamespace } from "../../tator-element.js";

export class MultiAttributeEditPanel extends TatorElement {
  constructor() {
    super();

    // resize vars
    this.open = false;
    this._movingPanel = false;

    // TODO deprecate _bulkEditModal
    this._bulkEditModal = document.createElement("modal-dialog");
    this._bulkEditModal._titleDiv.innerHTML = "Select Attribute(s)";

    this._bulkEditBar = document.createElement("div");
    this._bulkEditBar.setAttribute(
      "class",
      " d-flex flex-wrap position-relative pt-3"
    ); //px-3
    // this._bulkEditModal._main.appendChild(this._bulkEditBar);
    this._shadow.appendChild(this._bulkEditBar);

    this._resizer = document.createElement("div");
    this._resizer.className = "bulk-edit-bar-drag-handle ";
    this._bulkEditBar.appendChild(this._resizer);
    this.setUpResize();

    let barLeftTop = document.createElement("div");
    barLeftTop.setAttribute("class", "bulk-edit-bar--left col-4");
    this._bulkEditBar.appendChild(barLeftTop);

    // Escape Bulk Edit
    this.xClose = document.createElement("a");
    this.xClose.setAttribute(
      "class",
      "hidden text-white btn-clear px-2 py-2 clickable text-underline position-absolute"
    );
    this.xClose.setAttribute("style", "top:0;right:0;");
    this._shadow.appendChild(this.xClose);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-x");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this.xClose.appendChild(svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Close";
    svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M5.293 6.707l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293 5.293 5.293c0.391 0.391 1.024 0.391 1.414 0s0.391-1.024 0-1.414l-5.293-5.293 5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293-5.293-5.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414z"
    );
    svg.appendChild(path);

    // const exitText = document.createTextNode("Exit bulk edit");
    // this.xClose.appendChild(exitText);

    let barMiddleTop = document.createElement("div");
    barMiddleTop.setAttribute("class", "bulk-edit-bar--middle col-4");
    this._bulkEditBar.appendChild(barMiddleTop);

    let barRightTop = document.createElement("div");
    barRightTop.setAttribute("class", "col-4");
    this._bulkEditBar.appendChild(barRightTop);

    // let barLeft = document.createElement("div");
    // barLeft.setAttribute("class", "py-2 bulk-edit-bar--left col-12")
    // this._bulkEditModal._footer.appendChild(barLeft);

    // let barRight = document.createElement("div");
    // barRight.setAttribute("class", "py-2 bulk-edit-bar--right col-6")
    // this._bulkEditModal._footer.appendChild(barRight);

    /////
    this._back = document.createElement("a");
    // this._back.setAttribute("class", "text-purple clickable");
    // this._back.textContent = "< Back to Select";
    // barLeftTop.appendChild(this._back);

    /////
    this._compare = document.createElement("a");
    // this._compare.setAttribute("class", "text-purple clickable pb-3 text-right");
    // this._compare.textContent = "Compare >";
    // barRightTop.appendChild(this._compare);

    //
    // this._h2 = document.createElement("h2");
    // this._h2.setAttribute("class", "py-2 px-2");
    // this._h2.textContent = "Choose attributes:";
    // barLeftTop.appendChild(this._h2);

    // Attributes panel
    this.div = document.createElement("div");
    this.div.setAttribute(
      "class",
      "bulk-edit-attr-choices_bulk-edit rounded-2"
    );
    barLeftTop.appendChild(this.div);

    let titleDiv = document.createElement("div");
    // titleDiv.setAttribute("class", "text-gray d-flex flex-row flex-items-center f1 py-2 px-2 clickable");
    // this._titleText = document.createTextNode("Select attributes to edit.");
    // this._chevron = document.createElementNS(svgNamespace, "svg");
    // this._chevron.setAttribute("class", "chevron chevron-trigger-90");
    // this._chevron.setAttribute("viewBox", "0 0 24 24");
    // this._chevron.setAttribute("height", "1em");
    // this._chevron.setAttribute("width", "1em");
    // const chevronPath = document.createElementNS(svgNamespace, "path");
    // chevronPath.setAttribute("d", "M9.707 18.707l6-6c0.391-0.391 0.391-1.024 0-1.414l-6-6c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0z");
    // this._chevron.appendChild(chevronPath);

    // titleDiv.appendChild(this._titleText);
    // titleDiv.appendChild(this._chevron);
    // this.div.append(titleDiv);

    // add listener
    // titleDiv.addEventListener("click", (e) => {
    //    e.preventDefault();
    //    this._toggleAttributes();
    // });

    // Right = side
    // this._selectionSummary = document.createElement("div");
    // this._selectionSummary.setAttribute("class", "py-1 bulk-edit--quick-select")
    // barRightTop.appendChild(this._selectionSummary);

    // this._selectionCount = document.createElement("span");
    // this._selectionCount.setAttribute("class", "px-1 text-bold");
    // this._selectionCount.textContent = "0";
    // this._selectionSummary.appendChild(this._selectionCount);

    // this._selectionCountText = document.createElement("span");
    // this._selectionCountText.textContent = "Localizations";
    // this._selectionSummary.appendChild(this._selectionCountText);

    // this._topBarH3 = document.createElement("h3");
    // this._topBarH3.setAttribute("class", "entity-panel--container--top-bar--h3 text-semibold h3 ");
    // this._headingText = document.createElement("span");
    // this._headingText.appendChild(document.createTextNode("Edit Attributes"));
    // this._topBarH3.appendChild(this._headingText);
    // this._bulkEditBar.appendChild(this._topBarH3);

    // //
    this._bulkEditForm = document.createElement("div");
    this._bulkEditForm.setAttribute(
      "class",
      "bulk-edit-form__panel-group mx-3 py-3 text-gray f2 px-6 rounded-2"
    );
    barMiddleTop.appendChild(this._bulkEditForm);

    // let heading = document.createElement("h3");
    // heading.setAttribute("class", "py-3 text-white h3 text-semibold css-truncate heading");
    // heading.textContent = "Bulk Edit";
    // this._bulkEditForm.appendChild(heading);

    this._selectionSummary = document.createElement("span");
    this._selectionSummary.setAttribute("class", "pr-3");
    // this._quickSelectAllDiv.appendChild(this._selectionSummary);

    this._selectionPreCountText = document.createElement("span");
    this._selectionPreCountText.textContent = "Bulk Edit";
    this._selectionSummary.appendChild(this._selectionPreCountText);

    this._selectionCount = document.createElement("span");
    this._selectionCount.setAttribute("class", "px-1 text-bold");
    this._selectionCount.textContent = "0";
    this._selectionSummary.appendChild(this._selectionCount);

    this._selectionCountText = document.createElement("span");
    this._selectionCountText.textContent = "Localization(s)";
    this._selectionSummary.appendChild(this._selectionCountText);

    this._compareButton = document.createElement("button");
    // this._compareButton.setAttribute("class", "btn btn-clear btn-outline py-2 px-2")
    // this._compareButton.textContent = "Compare";
    // barLeft.appendChild(this._compareButton);

    this._editButton = document.createElement("button");
    this._editButton.setAttribute(
      "class",
      "bulk-edit-submit-button btn btn-clear py-2 px-2 disabled col-12"
    );
    // this._editButton.style.width = "250px";
    this._editButton.disabled = true;
    this._editButton.appendChild(this._selectionSummary);
    barRightTop.appendChild(this._editButton);

    // Other tools
    this._otherTools = document.createElement("div");
    this._otherTools.setAttribute("class", "mt-3");
    barRightTop.appendChild(this._otherTools);

    // const otherToolsText = document.createTextNode("Other tools:");
    // this._otherTools.appendChild(otherToolsText);

    // this._continueToSelect = document.createElement("button");
    // this._continueToSelect.setAttribute("class", "btn btn-clear py-2 col-12 disabled")
    // let _continueToSelectText = document.createTextNode("Select Localizations >");
    // this._continueToSelect.appendChild(_continueToSelectText);
    // this._continueToSelect.disabled = true;
    // this._bulkEditModal._footer.appendChild(this._continueToSelect);

    // ADD EVENT LISTENERS
    // this._back.addEventListener("click", () => {
    //    this.dispatchEvent(new Event("select-click"));
    // });
    // this._compare.addEventListener("click", () => {
    //    this.dispatchEvent(new Event("comparison-click"));
    // });
    this._editButton.addEventListener("click", () => {
      this.dispatchEvent(new Event("save-edit-click"));
    });
    // this._continueToSelect.addEventListener("click", () => {
    //    return this.dispatchEvent(new Event("select-click"));
    // });

    // vars
    this._attributeCheckBoxList = [];
    this._attribute_types = new Map();
    this._selectionMain = new Map();
    this._selectionValues = new Map();
    this._shownTypes = new Map();
    this._inputGroup = new Map();
    this._inputs = new Map();
    this._inputsOnly = [];
    this.resultsFilter = {
      containsAttributes: false,
      attributes: [],
    };
  }

  close() {
    this._bulkEditModal._closeCallback();
  }

  _toggleAttributes(hideFlag = null) {
    for (let [id, element] of this._selectionMain.entries()) {
      if (hideFlag == "hide") {
        if (!element.classList.contains("not-in-use"))
          element.classList.add("hidden");
        this._chevron.classList.add("chevron-trigger-90");
      } else {
        if (!element.classList.contains("not-in-use"))
          element.classList.toggle("hidden");
        this._chevron.classList.toggle("chevron-trigger-90");
      }
    }
  }

  show(val = true) {
    this.hidden = false;

    return this._bulkEditModal.setAttribute("is-open", "true");
  }
  /*
         let nameIsFilteredOn = false;
      console.log("SHOW!");

      if (true) {
         let filterNames = [];

         for (let [id, input] of this._inputs) {
            // let name = input.getAttribute("name");
            // Update bulk edit form input visibility


            for (let set of this._selectionValues) {
               let vals = set.getValue();
               for (let name of Array.from(vals)) {
                  if (input.hidden !== false && this.resultsFilter.attributes.includes(name)) {
                     console.log("test");
                     nameIsFilteredOn = true;
                     filterNames.push(name);
                  }
               }
            }
         }

         console.log(filterNames);

         // after looping set this message
         if (nameIsFilteredOn) {
            console.log("Warning: filter contains attribute.")
            this._warningConfirmation.hidden = false;
            this.dispatchEvent(new CustomEvent("attribute-is-filtered-on", { detail: { names: filterNames } }))
         } else {
            this._warningConfirmation.hidden = true;
         }
      }*/

  isHidden() {
    return this.hidden;
  }

  addLocType(typeData) {
    // console.log("ADD loc type typedata=");
    // console.log(typeData);

    let typeName = typeData.name ? typeData.name : "";

    // don't re-add this type, or don't add if visible=false...
    if (this._shownTypes[typeData.id] || typeData.visible == false) {
      return false;
    } else {
      this._shownTypes[typeData.id] = true;
    }

    // // Main labels box
    let labelsMain = document.createElement("div");
    labelsMain.setAttribute(
      "class",
      "entity-gallery-labels rounded-2 my-2  col-12"
    ); //d-flex flex-row flex-justify-center flex-justify-between

    let idText = document.createElement("div");
    idText.setAttribute("class", "text-gray f3 px-3 mt-3");
    idText.textContent = `${typeName} | Type ID: ${typeData.id}`;
    labelsMain.appendChild(idText);

    // Style div for checkbox set
    let styleDiv = document.createElement("div");
    styleDiv.setAttribute(
      "class",
      "entity-gallery-labels--title entity-gallery-labels--checkbox-div px-3 py-1 rounded-2"
    );
    labelsMain.appendChild(styleDiv);

    this._warningConfirmation = document.createElement("div");
    // this._warningConfirmation.setAttribute("class", "pb-3");
    // this._warningConfirmation.style.borderBottom = "1px solid white";
    // this._warningConfirmation.hidden = true;
    // styleDiv.appendChild(this._warningConfirmation);

    // let warning = document.createElement("span");
    // warning.textContent = "Note: For bulk edit review purposes, a temporary 'CACHED' filter is being used to preserve pagination. To remove click 'x', filter again, or refresh.";
    // warning.setAttribute("class", "text-gray");
    // this._warningConfirmation.appendChild(warning);

    this._prefetchBool = document.createElement("bool-input");
    this._prefetchBool.setAttribute("name", "Keep default behavior?");
    this._prefetchBool.setAttribute("on-text", "Yes");
    this._prefetchBool.setAttribute("off-text", "No");
    this._prefetchBool.setValue(true);
    this._prefetchBool.hidden = true;
    // this._warningConfirmation.appendChild(this._prefetchBool);

    // No attributes, so we can stop and provide a message
    if (typeData.attribute_types.length === 0) {
      const message = document.createElement("div");
      message.setAttribute("class", "text-white f2 py-2");
      message.textContent = `${typeName} has no custom attributes.`;
      styleDiv.appendChild(message);
    } else {
      // If ok, create the checkbox list
      const checkboxList = this.makeListFrom(typeData);

      //

      const selectionBoxes = document.createElement("checkbox-set");
      selectionBoxes._colSize = "py-1 pr-2";
      selectionBoxes._inputDiv.setAttribute(
        "class",
        "d-flex flex-row flex-wrap col-12"
      );
      selectionBoxes.setValue(checkboxList);

      // Save to refer to in get/set later
      this._selectionValues.set(typeData.id, selectionBoxes);
      this._selectionMain.set(typeData.id, styleDiv);

      // Append to main box
      styleDiv.appendChild(selectionBoxes);

      selectionBoxes.addEventListener("change", (e) => {
        this._boxValueChanged(selectionBoxes, typeData.id);
      });

      // when we relied on global attribute list (not by type)
      // we cleared each time, because the last iteration would have all the types
      // this.div.innerHTML = "";

      // Make and Add associated hidden inputs
      this._addInputs(typeData.attribute_types, typeData.id);
    }

    // Add the selection boxes
    this.div.appendChild(labelsMain);
  }

  _boxValueChanged(checkBoxSet, typeId) {
    let attributeNames = checkBoxSet.getValue();
    attributeNames = Array.from(attributeNames);
    // let inputs = this._bulkEditForm.querySelector(`#${typeId}`);
    let nameIsFilteredOn = false;

    // console.log("box value changed");
    // console.log(attributeNames);

    let inputDiv = this._inputGroup.get(typeId);
    for (let input of inputDiv.children) {
      let name = input.getAttribute("name");
      if (attributeNames.includes(name)) {
        input.hidden = false;
      } else {
        input.hidden = true;
      }

      // //Update compare table via event
      // this.dispatchEvent(new CustomEvent("attribute-changed", { detail: { name: name, added: !input.hidden, typeId } }));
    }

    let filterNames = [];
    for (let name of attributeNames) {
      if (this.resultsFilter.attributes.includes(name)) {
        console.warn("Warning: filter contains attribute.");
        nameIsFilteredOn = true;
        filterNames.push(name);
      }
    }

    // after looping set this message
    if (nameIsFilteredOn) {
      this._warningConfirmation.hidden = false;
      this.dispatchEvent(
        new CustomEvent("attribute-is-filtered-on", {
          detail: { names: filterNames },
        })
      );
    } else {
      this._warningConfirmation.hidden = true;
    }
    // }
  }

  /*
   * Created a list based on attribute properties
   * - sorts, then saves as Array
   * - allows for "first checked" functionality #todo to use set in future
   * - Array is usable by checkbox set which requires:
   * - - @param id : string, attr.name
   * - - @param name : string, attr.name
   * - - @param checked : boolean
   */
  makeListFrom(typeData) {
    this.newList = [...this._attributeCheckBoxList];
    const typeCheckboxList = [];

    // Non-hidden attributes (ie order >= 0))
    let nonHiddenAttrs = [];

    // This collapses attributes with the same name
    // for (let attr of typeData.attribute_types) {
    //    console.log(attr);
    //    if (attr.order >= 0) {
    //       if (!this._attribute_types.has(attr.name)) nonHiddenAttrs.push(attr);
    //    }
    // }

    if (typeData.attribute_types.length > 0) {
      // Show array by order, or alpha
      const sorted = typeData.attribute_types.sort((a, b) => {
        return a.order - b.order || a.name - b.name;
      });

      // Create an array for checkbox set el
      for (let attr of sorted) {
        // console.log(attr);
        let checkboxData = {
          id: encodeURI(attr.name),
          name: attr.name,
          checked: false,
        };
        this._attribute_types.set(attr.name, attr);
        this.newList.push(checkboxData);
        typeCheckboxList.push(checkboxData);
        // reset checked - only check the first one
        //   if(checked) checked = false;
      }
    }
    this._attributeCheckBoxList = this.newList;

    // console.log(typeCheckboxList);

    // return this.newList;
    return typeCheckboxList;
  }

  hideShowTypes(setOfMetaIds) {
    // console.log(setOfMetaIds);
    // for (let [typeId, selectionDiv] of this._selectionMain.entries()) {
    //    console.log(`TYPE ID ${typeId}`)
    //    if (setOfMetaIds.has(typeId)) {
    //       selectionDiv.classList.remove("hidden");
    //       selectionDiv.classList.remove("not-in-use");
    //       let inputDiv = this._inputGroup.get(typeId);
    //       inputDiv.hidden = false;
    //    } else {
    //       selectionDiv.classList.add("hidden");
    //       selectionDiv.classList.add("not-in-use");
    //       let inputDiv = this._inputGroup.get(typeId);
    //       inputDiv.hidden = true;
    //    }
    // }
  }

  setSelectionBoxValue({ typeId, values }) {
    // sets checked  -- from listeners to attribute label change / default shown on card
    let listForType = this._selectionValues.get(typeId);

    // Evaluate list for shown types
    if (listForType) {
      for (let box of listForType._inputs) {
        let boxName = box.getAttribute("name");

        if (values.includes(boxName) == true) {
          box._checked = true;
          // console.log(box);
        } else {
          box._checked = false;
        }
      }

      this._boxValueChanged(listForType, typeId);
    }
  }

  // Loop through and add hidden inputs for each data type
  _addInputs(attributeTypes, dataTypeId) {
    // console.log("Creating div for inputs... type id " + dataTypeId);
    const div = document.createElement("div");
    div.setAttribute("class", "annotation__panel-group_bulk-edit text-gray f2");
    div.setAttribute("id", dataTypeId);

    // if (typeof this._inputGroup.get(dataTypeId) == "undefined") {
    // this._bulkEditForm.innerHTML = "";
    this._bulkEditForm.appendChild(div);
    this._inputGroup.set(dataTypeId, div);
    // } else {
    //    return true;
    // }

    // div.hidden = true;

    // let label = document.createElement("label");
    // label.setAttribute("class", "bulk-edit-legend");
    // label.textContent = `Type ID: ${dataTypeId}`;
    // div.appendChild(label);

    // User defined attributes
    const sorted = attributeTypes.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    for (let attributeDef of sorted) {
      let widget;
      var ignorePermission = false;
      // let attributeDef = a;

      if (attributeDef.dtype == "bool") {
        widget = document.createElement("bool-input");
        widget.setAttribute("name", attributeDef.name);
        widget.setAttribute("on-text", "Yes");
        widget.setAttribute("off-text", "No");
      } else if (attributeDef.dtype == "enum") {
        widget = document.createElement("enum-input");
        widget.setAttribute("name", attributeDef.name);
        let choices = [];
        for (let idx = 0; idx < attributeDef.choices.length; idx++) {
          let choice = { value: attributeDef.choices[idx] };
          if (attributeDef.labels) {
            choice.label = attributeDef.labels[idx];
          }
          choices.push(choice);
        }
        widget.choices = choices;
      } else if (attributeDef.dtype == "datetime") {
        try {
          widget = document.createElement("datetime-input");
          widget.setAttribute("name", attributeDef.name);
        } catch (e) {
          console.error("Error making datetime input", e);
        }

        if (
          (widget && widget._input && widget._input.type == "text") ||
          !widget._input
        ) {
          console.log(
            "No browser support for datetime, or error. Degrading to text-input."
          );
          widget = document.createElement("text-input");
          widget.setAttribute("name", attributeDef.name);
          widget.setAttribute("type", attributeDef.dtype);
          widget.autocomplete = attributeDef.autocomplete;
        }

        if (attributeDef.style) {
          const style_options = attributeDef.style.split(" ");
          if (style_options.includes("disabled")) {
            widget.permission = "View Only";
            widget.disabled = true;
            ignorePermission = true;
          }
        }
      } else if (attributeDef.style) {
        const style_options = attributeDef.style.split(" ");
        if (
          attributeDef.dtype == "string" &&
          style_options.includes("long_string")
        ) {
          widget = document.createElement("text-area");
          widget.setAttribute("name", attributeDef.name);
          widget.setAttribute("type", attributeDef.dtype);
        } else {
          widget = document.createElement("text-input");
          widget.setAttribute("name", attributeDef.name);
          widget.setAttribute("type", attributeDef.dtype);
          widget.autocomplete = attributeDef.autocomplete;
        }

        if (style_options.includes("disabled")) {
          widget.permission = "View Only";
          widget.disabled = true;
          ignorePermission = true;
        }
      } else {
        // TODO: Implement a better geopos widget
        widget = document.createElement("text-input");
        widget.setAttribute("name", attributeDef.name);
        widget.setAttribute("type", attributeDef.dtype);
        widget.autocomplete = attributeDef.autocomplete;
      }

      // Set whether this widget is required
      if (typeof attributeDef.required === "undefined") {
        widget.required = false;
      } else {
        widget.required = attributeDef.required;
      }

      if (typeof this._permission !== "undefined" && !ignorePermission) {
        widget.permission = this._permission;
      }

      widget.hidden = true;
      div.appendChild(widget);

      this._inputs.set(`${attributeDef.name} type_${dataTypeId}`, widget);
      this._inputsOnly.push(widget);

      widget.addEventListener("change", () => {
        if (this._emitChanges) {
          this.dispatchEvent(new Event("change"));
        }
      });
    }
  }

  getValue() {
    //
    const value = [];

    // Each group is related to a type ID
    for (const group of this._bulkEditForm.children) {
      if (!group.hidden) {
        let response = { typeId: group.id, values: {}, rejected: {} };
        for (const widget of group.children) {
          if (!widget.hidden && widget.tagName !== "LABEL") {
            let name = widget.getAttribute("name");
            let val = widget.getValue();

            // console.log(`Evaluating value of widget named ${name}. Value = ${val}`);

            if (val !== null) {
              response.values[name] = val;
            } else {
              response.rejected[name] = name;
            }
          }
        }
        value.push(response);
      }
    }
    return value;
  }

  shownAttrNames() {
    let values = new Map();

    // Each group is related to a type ID
    for (const group of this._bulkEditForm.children) {
      if (!group.hidden) {
        let typeId = group.id;
        for (const widget of group.children) {
          if (!widget.hidden && widget.tagName !== "LABEL") {
            // console.log(widget.getAttribute("name"));
            //${e.detail.name} type_${e.detail.typeId}
            values.set(
              `${widget.getAttribute("name")} type_${typeId}`,
              widget.getAttribute("name")
            );
          }
        }
      }
    }
    return values;
  }

  setCount(count) {
    if (count === 0 || count === "0") {
      this._editButton.disabled = true;
      this._editButton.classList.add("disabled");
    } else {
      this._editButton.disabled = false;
      this._editButton.classList.remove("disabled");
    }
    this._selectionCount.textContent = count;
  }

  updateWarningList(resultsFilter) {
    return (this.resultsFilter = resultsFilter);
  }

  resetWidgets() {
    for (const group of this._bulkEditForm.children) {
      for (const widget of group.children) {
        if (widget.tagName !== "LABEL") widget.reset();
      }
    }
  }

  setUpResize() {
    const initResizePanel = (e) => {
      if (!this._movingPanel) {
        this._movingPanel = true;
        window.addEventListener("mousemove", resizePanel, false);
        window.addEventListener("mouseup", stopResizePanel, false);
      }
    };
    const resizePanel = (e) => {
      // if (!this.open) {
      //   // #todo take what you need from toggleOpen so this doesn't end up in the negative side
      //   this._bulkEditBar.style.height = "300px";
      // }
      if (this._movingPanel) {
        this._bulkEditBar.style.height =
          window.innerHeight - e.clientY + 0.02 * window.innerHeight + "px";
        this.div.style.maxHeight = this._bulkEditBar.style.height;
      }
    };

    const stopResizePanel = (e) => {
      window.removeEventListener("mousemove", resizePanel, false);
      window.removeEventListener("mouseup", stopResizePanel, false);

      this._bulkEditBar.style.height = `${this._bulkEditBar.offsetTop + 40} px`;

      this._movingPanel = false;
    };

    this._resizer.addEventListener("mousedown", initResizePanel, false);
  }
}

customElements.define(
  "entity-gallery-multi-attribute-edit-panel",
  MultiAttributeEditPanel
);
