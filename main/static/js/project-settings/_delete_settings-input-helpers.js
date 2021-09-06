/* Class with methods return input types with preset values for editing.*/
class SettingsInput {
  constructor(customClass, customColClass) {
    // Feature-related class(es) to customize form element. Applies to all elements.
    this.customClass = customClass || "";
    this.validate = new TypeFormValidation();
  }

  /* Returns an input of type text with an initial value */
  inputText({
        value = '',
        customCol = 'col-md-9 col-sm-8',
        labelText = '',
        type = 'text', // can also be HIDDEN
        name = '',
        min = false,
        max = false,
        required = false,
        minlength = false,
        maxlength = false,
        pattern = false,
        disabledInput = false,
      } = {}
    ){
      const forId = this._getUniqueIdentifier(name);
      const inputTextElement = document.createElement("input");
      inputTextElement.setAttribute("type", type);
      inputTextElement.setAttribute("value", value);
      inputTextElement.setAttribute("name", name);
      inputTextElement.setAttribute("id", forId);

      // HTML5 built-in validation attributes
      if (min) inputTextElement.setAttribute("min", min);
      if (max) inputTextElement.setAttribute("max", max);
      if (required) inputTextElement.setAttribute("required", required);
      if (minlength) inputTextElement.setAttribute("minlength", minlength);
      if (maxlength) inputTextElement.setAttribute("maxlength", maxlength);
      if (pattern) inputTextElement.setAttribute("pattern", pattern);
      if (disabledInput) inputTextElement.setAttribute("disabled", "");

      const classes = `form-control input-monospace input-hide-webkit-autofill ${this.customClass} ${customCol}`
      inputTextElement.setAttribute("class", classes);

      if(labelText == null){
        // No label also means inline warning needs to be set separately
        return inputTextElement;
      } else {
        const inputWithLabel = this.labelWrap({
          "labelText": labelText,
          "inputNode": inputTextElement,
          "forId": forId
        });

        return inputWithLabel;
      }
  }

    /* Returns an input with color picker, w/ ability to not specify */
    colorInput({
      value = '',
      customCol = 'col-md-9 col-sm-8',
      labelText = '',
      type = 'text', // can also be HIDDEN
      name = '',
      min = false,
      max = false,
      required = false,
      minlength = false,
      maxlength = false,
      pattern = false
    } = {}
  ){
    // Specified?
    let specified = false;

    if(value != null && value != "") {
      specified = true;
    } else {
      // unspecified default
      value = "#ffffff";
    }
    
    /* Unspecified Option*/
    // Container
    const unspecColorInput = document.createElement("div");
    unspecColorInput.setAttribute("class", "float-left col-md-5 col-sm-12");

    // Unspecified radio option
    const inputElementUnspec = document.createElement("input");
    inputElementUnspec.setAttribute("type", "radio");
    inputElementUnspec.checked = !specified ? true : false;
    inputElementUnspec.setAttribute("value", "na");
    inputElementUnspec.setAttribute("name", "unspecifiedColor");
    inputElementUnspec.setAttribute("id", "unspecifiedColor");
    //labelForUnspec.append(inputElementUnspec);

    // Unspecified label
    const labelForUnspec = document.createElement("label");
    labelForUnspec.setAttribute("for", "unspecifiedColor");
    labelForUnspec.setAttribute("class", "px-2");
    labelForUnspec.innerHTML = "Default: "

    // Unspecified Color preview Input
    const unspecPreview = document.createElement("input");
    unspecPreview.setAttribute("type", type);
    unspecPreview.setAttribute("value", "#40E0D0");
    unspecPreview.disabled = true;
    //unspecPreview.setAttribute("id", forId);

    // Unspecified Container contents
    unspecColorInput.appendChild(inputElementUnspec);
    unspecColorInput.appendChild(labelForUnspec);
    unspecColorInput.appendChild(unspecPreview);

    /* Choose your own Option*/
    // Container
    const colorInput = document.createElement("div");
    const forId = this._getUniqueIdentifier(name);
    colorInput.setAttribute("class", "float-left col-md-7 col-sm-12 dflex");

    // Choose Color radio option
    const inputColorRadio = document.createElement("input");
    inputColorRadio.setAttribute("type", "radio");
    inputColorRadio.setAttribute("value", "color");
    inputColorRadio.checked = specified ? true : false;
    inputColorRadio.setAttribute("name", "unspecifiedColor");
    inputColorRadio.setAttribute("id", "inputColorRadio");
    inputColorRadio.setAttribute("class", "px-2");

    // Choose color label
    const labelForColor = document.createElement("label");
    labelForColor.setAttribute("for", forId);
    labelForColor.setAttribute("class", "px-2");
    labelForColor.innerHTML = "Choose: "

    // Choose Color input
    const inputTextElement = document.createElement("input");
    inputTextElement.setAttribute("type", type);
    inputTextElement.setAttribute("value", value);
    inputTextElement.setAttribute("name", name);
    inputTextElement.setAttribute("id", forId);

    // Choose Container contents
    colorInput.appendChild(inputColorRadio);
    colorInput.appendChild(labelForColor);
    colorInput.appendChild(inputTextElement);

    /* Listeners */
    // Uncheck unspecifed when using color picker
    inputTextElement.addEventListener("click", () => {
      inputElementUnspec.checked = false;
      inputColorRadio.checked = true;
    });
    // Open color picker if radio button clicked
    inputColorRadio.addEventListener("input", (e) => {     
      if(e.target.value){
        inputTextElement.click();
      }
    });

    // Put into 2 cols
    const colorInputs = document.createElement("div");
    colorInputs.setAttribute("class", "clearfix col-md-9 col-sm-4")
    colorInputs.appendChild(unspecColorInput);
    colorInputs.appendChild(colorInput);

    // Add Settings page Label
    if(labelText == null){
      // No label also means inline warning needs to be set separately
      return colorInputs;
    } else {
      const inputWithLabel = this.labelWrap({
        "labelText": labelText,
        "inputNode": colorInputs,
        "forId": forId
      });

      return inputWithLabel;
    }
  }

  arrayInputText({
    value = '',
    customCol = 'col-md-9 col-sm-8',
    labelText = '',
    type = 'text', // can also be HIDDEN
    name = ''
  } = {}){
    const arrayInputDiv = document.createElement("div");
    // unique shared name for this set
    const forId = this._getUniqueIdentifier(name);

    // VALUE will be an array -- Loop the array and create TEXT INPUTS
    if(value && value.length > 0 ){
      for(let key in value){
        let showLabel = key == 0 ? labelText : "";
        // output smaller inputs into 3 cols
        let arrayInput = this.inputText({
            "value" : value[key],
            "labelText" : showLabel,
            "name" : name,
            "customCol" : 'col-2'
        });
        arrayInputDiv.appendChild(arrayInput);
      }
    } else {
      let arrayInput = this.inputText({
          "value" : "",
          "labelText" : labelText,
          "name" : name,
          "customCol" : 'col-2'
      });
      arrayInputDiv.appendChild(arrayInput);
    }

    // placeholder
    let placeholderNew = document.createElement("div");
    placeholderNew.setAttribute("class", "placeholderNew");
    arrayInputDiv.appendChild(placeholderNew);

    // Add new
    let addNewButton = this.addNewRow({
        "labelText" : "+ New",
        "callback" : ""
    });

    arrayInputDiv.appendChild(addNewButton);

    addNewButton.addEventListener("click", (event) => {
      event.preventDefault();
      let parentNode = event.target.parentNode.parentNode.parentNode;
      // Add another "+Add with input to the page"
      parentNode.querySelector(".placeholderNew").appendChild(
        this.inputText({
           "value" : "",
           "labelText" : "",
           "name" : name,
           "customCol" : 'col-2'
         })
       );
    });

    return arrayInputDiv;
  }

  // @TODO - Works but needs ovveride for label class
  inputRadioSlide({
    value = '',
    labelText = '',
    name = "",
    getSlide = false
  } = {} ){
    const forId = this._getUniqueIdentifier(name);
    const slide = document.createElement("settings-bool-input");
    let fieldset = slide.getFieldSet( name, forId );
    if(labelText !== null) slide.setLegendText(labelText);
    slide.setOnLabel("Yes");
    slide.setOffLabel("No");
    slide.setValue(value);

    if(getSlide) return { slide, fieldset };
    return fieldset;
  }

  multipleCheckboxes({
    value = '',
    labelText = '',
    name = '',
    checkboxList = ''
  } = {}){
    const setName = this._getUniqueIdentifier(name);
    const checkboxes = document.createElement("div");
    checkboxes.setAttribute("class", `col-md-9 col-sm-8`);

    const checkboxInner = document.createElement("div");
    checkboxInner.setAttribute("class", `d-flex flex-row flex-wrap flex-justify-between`);

    for(let data of checkboxList){
      checkboxInner.appendChild( this._miniCheckboxSet(data, setName) );
    }

    checkboxes.appendChild(checkboxInner);

    const checkboxesWithLabel = this.labelWrap({
      "labelText": labelText,
      "inputNode": checkboxes,
      "labelType" : "fieldset"
    });

    return checkboxesWithLabel;
  }

  _miniCheckboxSet(data, setName){
    // Outputs inputs in rows of three
    let miniCheckboxSet = document.createElement("label");
    miniCheckboxSet.setAttribute("class", "col-6 py-2");

    let checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("value", data.id);
    checkbox.setAttribute("name", setName);
    checkbox.setAttribute("class", "checkbox");
    if(data.data){
      checkbox.setAttribute("data-data", data.data);
    }

    if (data.checked) checkbox.checked = true;

    miniCheckboxSet.appendChild(checkbox);

    let textSpan = document.createElement("span");
    textSpan.setAttribute("class", "px-2 v-align-top");

    let labelText = document.createTextNode(data.name);
    textSpan.appendChild(labelText);
    miniCheckboxSet.appendChild(textSpan)

    return miniCheckboxSet;
  }



  /* Returns a select with options from array */
  inputSelectOptions({
    value = "", //current value
    labelText = "",
    customCol = "col-md-9 col-sm-8",
    optionsList = [],
    disabledInput = false,
    name = "",
    forId = ""
    } = {}
  ){
    if(optionsList === null || Array.isArray(optionsList) === false){
      return console.error("FormsHelper Error: Array type required to init select dropdown.");
    } else {
      const setName =this._getUniqueIdentifier(name);
      const inputSelect = document.createElement("select");
      const currentValue = value;

      inputSelect.setAttribute("class", this.customClass + " form-select select-md " + customCol);
      inputSelect.setAttribute("name", name);

      if(!disabledInput) inputSelect.style.color = "#fff";
      //
      for(let optionValue of optionsList){
        let inputOption = document.createElement("option");
        let optionText = document.createTextNode(optionValue.optText);
        let indexValue = optionValue.optValue;

        // Select Text
        inputOption.appendChild(optionText);

        // Select Value
        if(typeof indexValue == "undefined" && typeof currentValue == "undefined"){
          inputOption.value = ""; // ie. Nothing is selected...
        } else {
          inputOption.value = indexValue;

          if(indexValue == currentValue) {
            inputOption.setAttribute("selected", true);
            inputOption.checked = true;
            inputOption.selected = true;
          }
        }

        if(disabledInput) inputSelect.disabled = true;

        inputSelect.appendChild(inputOption);
      }

      if(forId == "") forId = setName
      const inputWithLabel = this.labelWrap({
        "labelText": labelText,
        "inputNode": inputSelect,
        "disabled" : disabledInput,
        "forId" : name
      });

      return inputWithLabel;
    }
  }

  


  /* Wraps any node in a label */
  labelWrap({
      labelText = '',
      disabled = false,
      forId = "",
      labelType = "label",
      inputNode //required
    } = {}
    ){
      let labelWrap = "";
      labelWrap = document.createElement(labelType);
      labelWrap.setAttribute("for", forId);
      labelWrap.setAttribute("class", "d-flex flex-items-center py-1 position-relative f1");

      // Create text for label
      const spanTextNode = document.createElement("span");
      spanTextNode.setAttribute("class", `col-md-3 col-sm-4 ${(disabled) ? "text-gray" : ""}`);
      labelWrap.append(spanTextNode);

      const spanText = document.createTextNode("");
      spanText.nodeValue = labelText;
      spanTextNode.appendChild(spanText);

      // Add label & text to a container
      const labelDiv = document.createElement("div");
      labelDiv.setAttribute("class", "form-group py-2 f1");
      labelDiv.appendChild(labelWrap);

      // Apppend Input (needs to be appened after the Label)
      labelWrap.append(inputNode);

      this.addWarningWrap(labelWrap, labelDiv, inputNode);

      return labelDiv;
    }

    addWarningWrap(labelWrap, labelDiv, inputNode, checkErrors = true){
      
      if(labelDiv.querySelector('.warning-row')){
        labelDiv.querySelector('.warning-row').remove();
      }
      // Warning Message Spot
      let warningRow = document.createElement("div");
      warningRow.setAttribute("class", "warning-row offset-lg-4 col-lg-8 pb-3");
      labelDiv.appendChild(warningRow);

      const warning = new InlineWarning();
      warningRow.appendChild(warning.div());

      // Dispatch events to validate, and listen for errors
      if(checkErrors){
        inputNode.addEventListener("input", (e) => {
          let hasError = this.validate.findError(inputNode.name, inputNode.value);
          if(hasError){
            let errorEvent = new CustomEvent("input-invalid", {"detail" : 
              {"errorMsg" : hasError}
            });
            inputNode.invalid = true;
            inputNode.classList.add("invalid");
            inputNode.dispatchEvent(errorEvent);
          } else {
            let successEvent = new CustomEvent("input-valid");
            inputNode.classList.remove("invalid");
            inputNode.dispatchEvent(successEvent);
          }    
        });

        inputNode.addEventListener("input-invalid", (e) => {
          warning.show(e.detail.errorMsg);
          labelWrap.classList.remove("caution");
          labelWrap.classList.remove("successed");
          labelWrap.classList.add("errored");
        });
      }

      inputNode.addEventListener("input-caution", (e) => {
        warning.showCaution(e.detail.errorMsg);
        labelWrap.classList.remove("successed");
        labelWrap.classList.remove("errored");
        labelWrap.classList.add("caution");
      });

      inputNode.addEventListener("input-valid", (e) => {
        labelWrap.classList.add("successed");
        labelWrap.classList.remove("errored");
        labelWrap.classList.remove("caution");
        warning.hide();
      }); 
    }

    addNewRow({
        labelText = '',
        callback = null
      } = {}){
        const labelWrap = document.createElement("label");
        labelWrap.setAttribute("class", "d-flex flex-items-center py-1 position-relative f1");

        const spanTextNode = document.createElement("span");
        const spanText = document.createTextNode("");
        const labelDiv = document.createElement("div"); 

        spanTextNode.setAttribute("class", "col-sm-4 col-md-3 text-gray clickable");
        spanText.nodeValue = labelText;
        spanTextNode.appendChild(spanText);

        labelWrap.append(spanTextNode);

        labelDiv.setAttribute("class", "py-2 f1 text-semibold");
        labelDiv.appendChild(labelWrap);

        return labelDiv;
      }

    /* Edit button */
    editButton({
      text = "Edit",
      customClass = "",
      forId = ""
    } = {}){
    //<input type="submit" value="Save" class="btn btn-charcoal btn-clear text-semibold">
      const button = document.createElement("label");
      button.setAttribute("for", forId);
      button.append(text);
      button.setAttribute("class", `btn btn-clear btn-charcoal text-semibold ${customClass} position-relative`);

      return button;
    }

    /* Returns an number input with an initial value */
    saveButton({ text = "Save"} = {}){
      const inputSubmit = document.createElement("input");
      inputSubmit.setAttribute("type", "submit");
      inputSubmit.setAttribute("value", text);
      inputSubmit.setAttribute("class", `btn btn-clear f1 text-semibold`);

      return inputSubmit;
    }

    /* Returns an number input with an initial value */
    resetLink({ text = "Reset"} = {}){
      const resetLink = document.createElement("a");
      resetLink.setAttribute("href", "#");
      resetLink.setAttribute("class", `px-5 f1 text-gray hover-text-white`);

      let resetLinkText = document.createTextNode(text);
      resetLink.appendChild( resetLinkText );

      return resetLink;
    }

   _getUniqueIdentifier(someText){
      return `${someText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 1000)}`;
    }

    _getSliderSetValue(radioSet){
      for(let s of radioSet){
        if(s.id.indexOf("on") > -1 && s.checked == true) return true
        if(s.id.indexOf("off") > -1 && s.checked == true) return false
      }
    }

    _setSliderSetValue(radioSet, span, val){
      for(let s of radioSet){
        if(s.id.indexOf("on") > -1 && s.checked == true && !val) span.click();
        if(s.id.indexOf("off") > -1 && s.checked == true && val) span.click();
      }
    }

    _getArrayInputValue(inputs, type = "input"){
      let array = [];

      for(let el of inputs){
        if(el.value != "" && el.value != null){
          if(type == "input"){
            array.push(el.value);
          } else if (type == "checkbox"){
            if(el.checked == true) array.push(Number(el.value));
          }
        }
      }

      return array;
    }

    _getOptions(array){
      return array.map( (i) => {
        return ({ "optText": i, "optValue": i });
      });
    }
}
