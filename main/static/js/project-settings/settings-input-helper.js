/* Class with methods return input types with preset values for editing.*/
class SettingsInput {
  constructor(customClass, customColClass) {
    // Feature-related class(es) to customize form element. Applies to all elements.
    this.customClass = customClass || "";
  }

  /* Returns an input of type text with an initial value */
  inputText({
        value = '',
        customCol = 'col-8',
        labelText = '',
        type = 'text', // can also be HIDDEN
        name = ''
      } = {}
    ){
      const inputTextElement = document.createElement("input");
      inputTextElement.setAttribute("type", type);
      inputTextElement.setAttribute("value", value);
      inputTextElement.setAttribute("name", name);

      const classes = `form-control input-monospace input-hide-webkit-autofill ${this.customClass} ${customCol}`
      inputTextElement.setAttribute("class", classes);

      if(labelText == null){
        return inputTextElement;
      } else {
        const inputWithLabel = this.labelWrap({
          "labelText": labelText,
          "inputNode": inputTextElement,
          "name": name
        });

        return inputWithLabel;
      }
  }

  arrayInputText({
    value = '',
    customCol = 'col-8',
    labelText = '',
    type = 'text', // can also be HIDDEN
    name = ''
  } = {}){
    const arrayInputDiv = document.createElement("div");
    // unique shared name for this set
    const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;

    // VALUE will be an array -- Loop the array and create TEXT INPUTS
    if(value.length > 0 ){
      for(let item of value){
        // output smaller inputs into 3 cols
        let arrayInput = this.inputText({
            "value" : item,
            "labelText" : labelText,
            "name" : setName,
            "customCol" : 'col-2'
        });
        arrayInputDiv.appendChild(arrayInput);
      }
    } else {
      let arrayInput = this.inputText({
          "value" : "",
          "labelText" : labelText,
          "name" : setName,
          "customCol" : 'col-2'
      });
      arrayInputDiv.appendChild(arrayInput);
    }

    // Add new
    let addNewButton = this.addNewRow({
        "labelText" : "+ New",
        "callback" : ""
    });

    arrayInputDiv.appendChild(addNewButton);

    addNewButton.addEventListener("click", (event) => {
      event.preventDefault();
      // Add another "+Add with input to the page"
      event.target.before(this.inputText({
           "value" : "",
           "labelText" : labelText,
           "name" : setName,
           "customCol" : 'col-2'
       }));
    });

    return arrayInputDiv;
  }

  /* Returns an input of type text with an initial value */
  inputCheckbox({
      value = '',
      customCol = '',
      labelText = '',
      type = 'checkbox'} = {}
    ){
     /*  const inputTextElement = document.createElement("input");
      inputTextElement.setAttribute("type", type);
      inputTextElement.setAttribute("value", value);
      if (value) inputTextElement.checked = true;
      inputTextElement.style.transform = "scale(1.5)";

      const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
      inputTextElement.setAttribute("name", setName);
      inputTextElement.setAttribute("class", `${this.customClass} ${customCol}`);

      let inputWithLabel = inputTextElement; //default

      if(labelText != null){
        inputWithLabel = this.labelWrap({
          "labelText": labelText,
          "inputNode": inputTextElement,
          "name": setName
        });
      }

      return inputWithLabel ;*/
      return this.inputRadioSlide({
        "value" : value,
        "customCol" : customCol,
        "labelText" : labelText,
        "type" : type
      });
  }

  // @TODO - Works but needs ovveride for label class
  inputRadioSlide({
    value = '',
    customCol = '',
    labelText = '',
    type = 'checkbox'} = {}
  ){
    let setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
    const slide = document.createElement("settings-bool-input");
    const fieldset = slide.getFieldSet( setName );
    slide.setLegendText(labelText);
    slide.setOnLabel("Yes");
    slide.setOffLabel("No");
    slide.setValue(value)

    return fieldset;
  }

  multipleCheckboxes({
    value = '',
    labelText = '',
    name = '',
    checkboxList = ''
  } = {}){
    const checkboxes = document.createElement("div");
    checkboxes.setAttribute("class", `col-8`);
    let setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;

    for(let data of checkboxList){
      let checkboxLabel = document.createElement("label");
      let checkbox = document.createElement("input");

      checkbox.setAttribute("type", "checkbox");
      checkbox.setAttribute("value", data.id);
      if (data.checked) checkbox.checked = true;
      checkbox.style.transform = "scale(1.5)";


      checkbox.setAttribute("name", setName);
      checkbox.setAttribute("class", `col-2`);

      checkboxLabel.appendChild(checkbox);

      let labelText = document.createTextNode(data.name);
      checkboxLabel.appendChild(labelText);

      checkboxes.appendChild(checkboxLabel);
    }

    const checkboxesWithLabel = this.labelWrap({
      "labelText": labelText,
      "inputNode": checkboxes,
      "labelAsDiv" : true
    });

    return checkboxesWithLabel;
  }



  /* Returns a select with options from array */
  inputSelectOptions({
    value = "", //current value
    labelText = "",
    customCol = "col-8",
    optionsList = [],
    disabledInput = false
    } = {}
  ){
    if(optionsList === null || Array.isArray(optionsList) === false){
      return console.error("FormsHelper Error: Array type required to init select dropdown.");
    } else {
      const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
      const inputSelect = document.createElement("select");
      const currentValue = value;

      inputSelect.setAttribute("class", this.customClass + " form-select select-md " + customCol);
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

      const inputWithLabel = this.labelWrap({
        "labelText": labelText,
        "inputNode": inputSelect,
        "disabled" : disabledInput
      });

      return inputWithLabel;
    }
  }

  editImageUpload({
    value = "", // img path
    labelText = "",
    customCol = "col-8",
    disabledInput = false,
    callBack = null // required
    } = {}){
      const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
      // provide an image object
      // provide label text
      // callback for button overlay

      if(value != null){
        let image = document.createElement("img");
        image.src = value;
        image.title = labelText;
        image.setAttribute("class", "projects__image");

        const inputWithLabel = this.labelWrap({
          "labelText": labelText,
          "inputNode": image,
          "name": setName
        });

        let editButton = document.createElement("button");
        editButton.setAttribute("class", "btn-edit-overlay");
        editButton.innerHTML = "Edit";

        inputWithLabel.appendChild(editButton);
        inputWithLabel.style.position = "relative";

        return inputWithLabel;
      } else {
        const inputWithLabel = this.labelWrap({
          "labelText": labelText,
          "inputNode": "",
          "name": setName
        });

        let editButton = document.createElement("button");
        editButton.setAttribute("class", "btn-edit-overlay add-new-thumbnail");
        editButton.innerHTML = "Add";

        inputWithLabel.appendChild(editButton);
        inputWithLabel.style.position = "relative";

        return inputWithLabel;
      }
    }


    /* Wraps any node in a label */
  labelWrap({
      labelText = '',
      disabled = false,
      labelAsDiv = false,
      inputNode } = {}
    ){
      let labelWrap = "";
      if(labelAsDiv){
        labelWrap = document.createElement("div");
      }else{
        labelWrap = document.createElement("label");
      }

      labelWrap.setAttribute("class", "d-flex flex-items-center py-1 position-relative f2");

      const spanTextNode = document.createElement("span");
      const spanText = document.createTextNode("");
      const labelDiv = document.createElement("div");

      spanTextNode.setAttribute("class", `col-4 ${(disabled) ? "text-gray" : ""}`);
      spanText.nodeValue = labelText;
      spanTextNode.appendChild(spanText);

      labelWrap.append(spanTextNode);
      labelWrap.append(inputNode);

      labelDiv.setAttribute("class", "py-2 px-2 f2");
      labelDiv.style.borderBottom = "none";
      labelDiv.appendChild(labelWrap);

      return labelDiv;
    }

    addNewRow({
        labelText = '',
        callback = null
      } = {}){
        const labelWrap = document.createElement("label");
        labelWrap.setAttribute("class", "d-flex flex-items-center py-1 position-relative f2");

        const spanTextNode = document.createElement("span");
        const spanText = document.createTextNode("");
        const labelDiv = document.createElement("div");

        spanTextNode.setAttribute("class", "col-4 text-gray clickable");
        spanText.nodeValue = labelText;
        spanTextNode.appendChild(spanText);

        labelWrap.append(spanTextNode);

        labelDiv.setAttribute("class", "py-2 px-2 f2");
        labelDiv.style.borderBottom = "none";
        labelDiv.appendChild(labelWrap);

        return labelDiv;
      }

    /* Returns an number input with an initial value */
    saveButton({ text = "Save"} = {}){
      const inputSubmit = document.createElement("input");
      inputSubmit.setAttribute("type", "submit");
      inputSubmit.setAttribute("value", text);
      inputSubmit.setAttribute("class", `btn btn-clear f2 text-semibold`);

      return inputSubmit;
    }

    /* Returns an number input with an initial value */
    resetLink({ text = "Reset"} = {}){
      const resetLink = document.createElement("a");
      resetLink.setAttribute("href", "#");
      resetLink.setAttribute("class", `px-5 f2 text-gray hover-text-white`);

      let resetLinkText = document.createTextNode(text);
      resetLink.appendChild( resetLinkText );

      return resetLink;
    }

}
