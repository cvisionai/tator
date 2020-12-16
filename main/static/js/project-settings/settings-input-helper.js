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
        type = 'text',
        disabled = 'false'
      } = {}
    ){
      const inputTextElement = document.createElement("input");

      inputTextElement.setAttribute("type", type);
      inputTextElement.setAttribute("value", value);

      console.log("type: "+type)

      const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
      inputTextElement.setAttribute("name", setName);
      inputTextElement.setAttribute("class", `form-control input-monospace input-hide-webkit-autofill ${this.customClass} ${customCol}`);
      inputTextElement.disabled = disabled;

      const inputWithLabel = this.labelWrap({
        "labelText": labelText,
        "inputNode": inputTextElement,
        "name": setName
      });

      return inputWithLabel;
  }

  inputTextArea({
        value = '',
        customCol = 'col-8',
        labelText = '',
        type = 'text',
        disabled = 'false'
      } = {}
    ){
      const textArea = document.createElement("textarea");
      textArea.value = value;

      const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
      textArea.setAttribute("name", setName);
      textArea.setAttribute("class", `form-control input-monospace input-hide-webkit-autofill ${this.customClass} ${customCol}`);

      const inputWithLabel = this.labelWrap({
        "labelText": labelText,
        "inputNode": textArea,
        "name": setName
      });

      return inputWithLabel;
    }

  /* Returns an input of type text with an initial value */
  inputCheckbox({
      value = '',
      customCol = '',
      labelText = '',
      type = 'checkbox'} = {}
    ){
      const inputTextElement = document.createElement("input");
      inputTextElement.setAttribute("type", type);
      inputTextElement.setAttribute("value", value);
      if (value) inputTextElement.checked = true;
      inputTextElement.style.transform = "scale(1.5)";

      const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
      inputTextElement.setAttribute("name", setName);
      inputTextElement.setAttribute("class", `${this.customClass} ${customCol}`);

      const inputWithLabel = this.labelWrap({
        "labelText": labelText,
        "inputNode": inputTextElement,
        "name": setName
      });

      return inputWithLabel;
  }

  /* Returns a set of radio buttons */
  inputRadios({
    value = "",
    labelText = "",
    customCol = "col-8"} = {}
  ){
    if(value === null || Array.IsArray(value) === false){
      return console.error("FormsHelper Error: Array type required to init radio buttons.");
    } else {
      const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
      const inputRadiosSpan = document.createElement("span");
      inputRadiosSpan.setAttribute("class", this.customClass + " " + customCol);

      for(let i of value){
        let val = value[i] || "";
        let inputRadiosElement = document.createElement("input");
        inputRadiosElement.setAttribute("type", "radio");
        inputRadiosElement.setAttribute("name", setName);
        inputRadiosElement.setAttribute("value", val);
        inputRadiosElement.setAttribute("class", `form-control`);
      }

      const inputWithLabel = this.labelWrap({
        "labelText": labelText,
        "inputNode": inputRadiosElement,
        "name": setName
      });

      return inputWithLabel;
    }
  }

  /* Returns a select with options from array */
  inputSelectOptions({
    value = "",
    labelText = "",
    customCol = "col-8"} = {}
  ){
    if(value === null || Array.IsArray(value) === false){
      return console.error("FormsHelper Error: Array type required to init select dropdown.");
    } else {
      const setName = `${labelText.replace(/[^\w]|_/g, "").toLowerCase()}-${Math.floor(Math.random() * 10)}`;
      const inputSelect = document.createElement("select");
      inputSelect.setAttribute("class", this.customClass + " form-select select-sm " + customCol);

      for(let i of value){
        let val = value[i] || "";
        let inputOption = document.createElement("option");
        let optionText = document.createTextNode(val);

        inputOption.appendChild(optionText);
        inputOption.setAttribute("value", val);
      }

      inputSelect.appendChild(inputOption);

      const inputWithLabel = this.labelWrap({
        "labelText": labelText,
        "inputNode": inputRadiosElement,
        "name": setName
      });

      return inputWithLabel;
    }
  }

    /* Wraps any node in a label */
    labelWrap({
      labelText = '',
      inputNode } = {}
    ){
      const labelWrap = document.createElement("label");
      labelWrap.setAttribute("class", "d-flex flex-items-center py-1 position-relative f2");

      const spanTextNode = document.createElement("span");
      const spanText = document.createTextNode("");
      const labelDiv = document.createElement("div");

      spanTextNode.setAttribute("class", "col-4 text-gray");
      spanText.nodeValue = labelText;
      spanTextNode.appendChild(spanText);

      labelWrap.append(spanTextNode);
      labelWrap.append(inputNode);

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
