class MultiAttributeEditPanel extends TatorElement {
   constructor() {
      super();

      this._bulkEditModal = document.createElement("modal-dialog");

      this._bulkEditModal._titleDiv.innerHTML = "Bulk Correct";

      this._bulkEditBar = document.createElement("div");
      this._bulkEditBar.setAttribute("class", " d-flex flex-wrap"); //px-3
      this._bulkEditModal._main.appendChild(this._bulkEditBar);



      let barLeftTop = document.createElement("div");
      barLeftTop.setAttribute("class", "bulk-edit-bar--left col-12")
      this._bulkEditBar.appendChild(barLeftTop);

      let barRightTop = document.createElement("div");
      barRightTop.setAttribute("class", "bulk-edit-bar--right_form col-5 d-flex flex-column")
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
      this.div.setAttribute("class", "bulk-edit-attr-choices_bulk-edit rounded-2");
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

      this._selectionCountText = document.createElement("span");
      // this._selectionCountText.textContent = "Localizations";
      // this._selectionSummary.appendChild(this._selectionCountText);


      // //
      this._bulkEditForm = document.createElement("div");
      this._bulkEditForm.setAttribute("class", "bulk-edit-form__panel-group py-3 text-gray f2 px-6 rounded-2");
      // barRightTop.appendChild(this._bulkEditForm);

      // let heading = document.createElement("h3");
      // heading.setAttribute("class", "py-3 text-white h3 text-semibold css-truncate heading");
      // heading.textContent = "Bulk Edit";
      // this._bulkEditForm.appendChild(heading);

      this._editButton = document.createElement("button");
      // this._editButton.setAttribute("class", "btn btn-clear py-2 px-2 mx-6 col-12")
      // let editText = document.createTextNode("Edit ");
      // this._editButton.appendChild(editText);
      // this._editButton.style.margin = "0 auto";
      // this._editButton.style.width = "80%";
      // this._editButton.disabled = true;
      // this._editButton.appendChild(this._selectionSummary);


      this._continueToSelect = document.createElement("button");
      this._continueToSelect.setAttribute("class", "btn btn-clear py-2 col-12")
      let _continueToSelectText = document.createTextNode("Select Localizations >");
      this._continueToSelect.appendChild(_continueToSelectText);
      // this._continueToSelect.style.margin = "0 auto";
      // this._continueToSelect.style.width = "80%";
      this._bulkEditModal._footer.appendChild(this._continueToSelect);

      // ADD EVENT LISTENERS
      // this._back.addEventListener("click", () => {
      //    this.dispatchEvent(new Event("select-click"));
      // });
      // this._compare.addEventListener("click", () => {
      //    this.dispatchEvent(new Event("comparison-click"));
      // });
      // this._editButton.addEventListener("click", () => {
      //    this.dispatchEvent(new Event("save-edit-click"));
      // });
      this._continueToSelect.addEventListener("click", () => {
         return this.dispatchEvent(new Event("select-click"));
      });

      // vars
      this._selectionMain = new Map();
      this._selectionValues = new Map();
      this._shownTypes = new Map();
      this._inputGroup = new Map();
      this._inputs = new Map();
      this._inputsOnly = [];
      this.resultsFilter = {
         containsAttributes: false,
         attributes: []
      };
   }

   close() {
      this._bulkEditModal._closeCallback();
   }

   _toggleAttributes(hideFlag = null) {
      for (let [id, element] of this._selectionMain.entries()) {
         if (hideFlag == "hide") {
            if (!element.classList.contains("not-in-use")) element.classList.add("hidden");
            this._chevron.classList.add('chevron-trigger-90');
         } else {
            if (!element.classList.contains("not-in-use")) element.classList.toggle("hidden");
            this._chevron.classList.toggle('chevron-trigger-90')
         }

      }

   }

   show(val = true) {
      this.hidden = false;

      console.log("SHOW!");

      if (true) {
         let nameIsFilteredOn = false;
         let filterNames = [];

         for (let [id, input] of this._inputs) {
            let name = input.getAttribute("name");
            // Update bulk edit form input visibility
            if (input.hidden == false && this.resultsFilter.attributes.includes(name)) {
               console.log("Warning: filter contains attribute.")
               nameIsFilteredOn = true;
               filterNames.push(name);
            }
         }

         // after looping set this message
         if (nameIsFilteredOn) {
            this.dispatchEvent(new CustomEvent("attribute-is-filtered-on", { detail: { names: filterNames } }))
         }
      }

      return this._bulkEditModal.setAttribute("is-open", "true");
   }

   isHidden() {
      return this.hidden;
   }

   addLocType(typeData) {
      // console.log(typeData);
      let typeName = typeData.name ? typeData.name : "";
      if (this._shownTypes.has(typeData.id)) {
         // don't re-add this type...
         return false;
      } else {
         this._shownTypes.set(typeData.id, true);
      }
      // Main labels box
      let labelsMain = document.createElement("div");
      labelsMain.setAttribute("class", "entity-gallery-labels rounded-2 my-2 d-flex flex-row flex-justify-center flex-justify-between col-12");

      // if(!hideTypeName){
      let _title = document.createElement("div");
      _title.setAttribute("class", "entity-gallery-labels--title py-3 px-2 col-3");
      _title.appendChild(document.createTextNode(`${typeName}`));

      if (typeof typeData.description !== "undefined" && typeData.description !== "") {
         let descriptionText = document.createElement("div");
         descriptionText.setAttribute("class", "f3 py-1 text-gray");
         descriptionText.textContent = `${typeData.description}`;
         _title.appendChild(descriptionText);
      }

      let idText = document.createElement("text");
      idText.setAttribute("class", "d-flex py-1 text-gray f3");
      idText.textContent = `Type ID: ${typeData.id}`;
      _title.appendChild(idText);
      labelsMain.appendChild(_title);
      //  }

      // Labels details with checkboxes
      let _labelDetails = document.createElement("div");
      _labelDetails.setAttribute("class", "float-right col-10");
      labelsMain.appendChild(_labelDetails);

      // Style div for checkbox set
      let styleDiv = document.createElement("div");
      styleDiv.setAttribute("class", "entity-gallery-labels--checkbox-div px-3 py-1 rounded-2");
      _labelDetails.appendChild(styleDiv);

      /**
    * Label Choice
    */
      // If ok, create the checkbox list
      const checkboxList = this.makeListFrom(typeData);

      const selectionBoxes = document.createElement("checkbox-set");
      selectionBoxes._colSize = "py-1 pr-2";
      selectionBoxes._inputDiv.setAttribute("class", "d-flex flex-row flex-wrap col-12");
      selectionBoxes.setValue(checkboxList);

      // Save to refer to in get/set later
      this._selectionValues.set(typeData.id, selectionBoxes);
      this._selectionMain.set(typeData.id, labelsMain);

      // Append to main box
      styleDiv.appendChild(selectionBoxes);

      selectionBoxes.addEventListener("change", (e) => {
         this._boxValueChanged(selectionBoxes, typeData.id);
      });

      this.div.appendChild(labelsMain)

      // Now make the inputs
      this._addInputs(typeData)
   }

   _boxValueChanged(checkBoxSet, typeId) {
      let attributeNames = checkBoxSet.getValue();
      attributeNames = Array.from(attributeNames)
      // let inputs = this._bulkEditForm.querySelector(`#${typeId}`);
      let nameIsFilteredOn = false;

      console.log("box value changed");
      console.log(attributeNames);

      // if( this._inputs && this._inputs.length > 0 ) {
      let filterNames = [];

      // if (this._bulkEditForm.children.length !== 0) {
         for (let input of this._inputsOnly) {
            let name = input.getAttribute("name");
            input.hidden = true;

            if (attributeNames.includes(name)) {
               input.hidden = false;
            }
         }

         // for (let group of this._bulkEditForm.children) {
         //    for (let input of group.children) {
         //       let name = input.getAttribute("name");
         //       console.log(input.tagName);
         //       // Update bulk edit form input visibility
         //       if (input.tagName !== "LABEL" && attributeNames.includes(name)) {
         //          input.hidden = false;
         //          if (this.resultsFilter.attributes.includes(name)) {
         //             console.log("Warning: filter containt attribute.")
         //             nameIsFilteredOn = true;
         //          }
         //       } else if (input.tagName !== "LABEL") {
         //          input.hidden = true;
         //       }

         //       //Update compare table via event
         //       this.dispatchEvent(new CustomEvent("attribute-changed", { detail: { name: name, added: !input.hidden, typeId } }));
         //    }
         // }

         // after looping set this message
         if (nameIsFilteredOn) {
            this.dispatchEvent(new CustomEvent("attribute-is-filtered-on", { detail: { names: filterNames } }))
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
      this.newList = [];
      let tmpArray = [...typeData.attribute_types];

      // Non-hidden attributes (ie order >= 0))
      let nonHiddenAttrs = [];
      let hiddenAttrs = [];
      for (let attr of typeData.attribute_types) {
         if (attr.order >= 0) {
            nonHiddenAttrs.push(attr);
         }
         else {
            hiddenAttrs.push(attr);
         }
      }

      // Show array by order, or alpha
      const sorted = nonHiddenAttrs.sort((a, b) => {
         return a.order - b.order || a.name - b.name;
      });

      sorted.push(...hiddenAttrs);

      // Create an array for checkbox set el
      for (let attr of sorted) {
         this.newList.push({
            id: encodeURI(attr.name),
            name: attr.name,
            checked: false
         });

         // reset checked - only check the first one
         //   if(checked) checked = false;
      }
      return this.newList;
   }

   hideShowTypes(setOfMetaIds) {
      console.log(setOfMetaIds);
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
      //
      let selectionBoxes = this._selectionValues.get(typeId);
      console.log("setSelectionBoxValue values:");
      console.log(values);

      for (let box of selectionBoxes._inputs) {
         let boxName = box.getAttribute("name");
         console.log(`values.includes(boxName) ${values.includes(boxName)}  .....${boxName}....`);

         if (values.includes(boxName)) {
            box._checked = true;
         } else {
            box._checked = false;
         }
      }

      this._boxValueChanged(selectionBoxes, typeId);
   }

   // Loop through and add hidden inputs for each data type
   _addInputs(dataType) {
      const div = document.createElement("div");
      div.setAttribute("class", "annotation__panel-group_bulk-edit text-gray f2");
      div.setAttribute("id", dataType.id);
      this._bulkEditForm.appendChild(div);
      this._inputGroup.set(dataType.id, div);
      // div.hidden = true;

      // let label = document.createElement("label");
      // label.setAttribute("class", "bulk-edit-legend");
      // label.textContent = `Type ID: ${dataType.id}`;
      // div.appendChild(label);

      // User defined attributes
      const sorted = dataType.attribute_types.sort((a, b) => {
         return a.order - b.order || a.name - b.name;
      });

      for (const attributeDef of sorted) {
         let widget;
         var ignorePermission = false;

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
               let choice = { 'value': attributeDef.choices[idx] };
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
               console.log(e.description);
            }

            if ((widget && widget._input && widget._input.type == "text") || !widget._input) {
               console.log("No browser support for datetime, or error. Degrading to text-input.");
               widget = document.createElement("text-input");
               widget.setAttribute("name", attributeDef.name);
               widget.setAttribute("type", attributeDef.dtype);
               // widget.autocomplete = attributeDef.autocomplete;
            }
            //widget.autocomplete = attributeDef.autocomplete; #TODO can this use autocomplete?
            if (attributeDef.style) {
               const style_options = attributeDef.style.split(' ');
               if (style_options.includes("disabled")) {
                  widget.permission = "View Only";
                  widget.disabled = true;
                  ignorePermission = true;
               }
            }

         } else if (attributeDef.style) {
            const style_options = attributeDef.style.split(' ');
            if (attributeDef.dtype == "string" && style_options.includes("long_string")) {
               widget = document.createElement("text-area");
               widget.setAttribute("name", attributeDef.name);
               widget.setAttribute("type", attributeDef.dtype);
            } else {
               widget = document.createElement("text-input");
               widget.setAttribute("name", attributeDef.name);
               widget.setAttribute("type", attributeDef.dtype);
               // widget.autocomplete = attributeDef.autocomplete;
            }

            if (style_options.includes("disabled")) {
               widget.permission = "View Only";
               widget.disabled = true;
               ignorePermission = true;
            }
         }
         else {
            // TODO: Implement a better geopos widget
            widget = document.createElement("text-input");
            widget.setAttribute("name", attributeDef.name);
            widget.setAttribute("type", attributeDef.dtype);
            // widget.autocomplete = attributeDef.autocomplete;
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

         div.appendChild(widget);

         this._inputs.set(`${attributeDef.name} type_${dataType.id}`, widget);
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

      for (const group of this._bulkEditForm.children) {
         if (!group.hidden) {
            let response = { typeId: group.id, values: {}, rejected: {} };
            for (const widget of group.children) {
               if (!widget.hidden && widget.tagName !== "LABEL") {
                  let name = widget.getAttribute("name");
                  let val = widget.getValue()

                  console.log(`Evaluating value of widget named ${name}. Value = ${val}`);

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
      for (const group of this._bulkEditForm.children) {
         if (!group.hidden) {
            let typeId = group.id;
            for (const widget of group.children) {

               if (!widget.hidden && widget.tagName !== "LABEL") {
                  console.log(widget.getAttribute("name"));
                  //${e.detail.name} type_${e.detail.typeId}
                  values.set(`${widget.getAttribute("name")} type_${typeId}`, widget.getAttribute("name"));
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
      return this.resultsFilter = resultsFilter;
   }

   resetWidgets() {
      for (const group of this._bulkEditForm.children) {
         for (const widget of group.children) {
            if (widget.tagName !== "LABEL") widget.reset();
         }
      }
   }

}

customElements.define("entity-gallery-multi-attribute-edit-panel", MultiAttributeEditPanel);