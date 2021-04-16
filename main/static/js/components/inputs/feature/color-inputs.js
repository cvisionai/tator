// /* Returns an input with color picker, w/ ability to not specify */
// colorInput({
//    value = '',
//    customCol = 'col-md-9 col-sm-8',
//    labelText = '',
//    type = 'text', // can also be HIDDEN
//    name = '',
//    min = false,
//    max = false,
//    required = false,
//    minlength = false,
//    maxlength = false,
//    pattern = false
//  } = {}
// ){
//  // Specified?
//  let specified = false;

//  if(value != null && value != "") {
//    specified = true;
//  } else {
//    // unspecified default
//    value = "#ffffff";
//  }
 
//  /* Unspecified Option*/
//  // Container
//  const unspecColorInput = document.createElement("div");
//  unspecColorInput.setAttribute("class", "float-left col-md-5 col-sm-12");

//  // Unspecified radio option
//  const inputElementUnspec = document.createElement("input");
//  inputElementUnspec.setAttribute("type", "radio");
//  inputElementUnspec.checked = !specified ? true : false;
//  inputElementUnspec.setAttribute("value", "na");
//  inputElementUnspec.setAttribute("name", "unspecifiedColor");
//  inputElementUnspec.setAttribute("id", "unspecifiedColor");
//  //labelForUnspec.append(inputElementUnspec);

//  // Unspecified label
//  const labelForUnspec = document.createElement("label");
//  labelForUnspec.setAttribute("for", "unspecifiedColor");
//  labelForUnspec.setAttribute("class", "px-2");
//  labelForUnspec.innerHTML = "Default: "

//  // Unspecified Color preview Input
//  const unspecPreview = document.createElement("input");
//  unspecPreview.setAttribute("type", type);
//  unspecPreview.setAttribute("value", "#40E0D0");
//  unspecPreview.disabled = true;
//  //unspecPreview.setAttribute("id", forId);

//  // Unspecified Container contents
//  unspecColorInput.appendChild(inputElementUnspec);
//  unspecColorInput.appendChild(labelForUnspec);
//  unspecColorInput.appendChild(unspecPreview);

//  /* Choose your own Option*/
//  // Container
//  const colorInput = document.createElement("div");
//  const forId = this._getUniqueIdentifier(name);
//  colorInput.setAttribute("class", "float-left col-md-7 col-sm-12 dflex");

//  // Choose Color radio option
//  const inputColorRadio = document.createElement("input");
//  inputColorRadio.setAttribute("type", "radio");
//  inputColorRadio.setAttribute("value", "color");
//  inputColorRadio.checked = specified ? true : false;
//  inputColorRadio.setAttribute("name", "unspecifiedColor");
//  inputColorRadio.setAttribute("id", "inputColorRadio");
//  inputColorRadio.setAttribute("class", "px-2");

//  // Choose color label
//  const labelForColor = document.createElement("label");
//  labelForColor.setAttribute("for", forId);
//  labelForColor.setAttribute("class", "px-2");
//  labelForColor.innerHTML = "Choose: "

//  // Choose Color input
//  const inputTextElement = document.createElement("input");
//  inputTextElement.setAttribute("type", type);
//  inputTextElement.setAttribute("value", value);
//  inputTextElement.setAttribute("name", name);
//  inputTextElement.setAttribute("id", forId);

//  // Choose Container contents
//  colorInput.appendChild(inputColorRadio);
//  colorInput.appendChild(labelForColor);
//  colorInput.appendChild(inputTextElement);

//  /* Listeners */
//  // Uncheck unspecifed when using color picker
//  inputTextElement.addEventListener("click", () => {
//    inputElementUnspec.checked = false;
//    inputColorRadio.checked = true;
//  });
//  // Open color picker if radio button clicked
//  inputColorRadio.addEventListener("input", (e) => {     
//    if(e.target.value){
//      inputTextElement.click();
//    }
//  });

//  // Put into 2 cols
//  const colorInputs = document.createElement("div");
//  colorInputs.setAttribute("class", "clearfix col-md-9 col-sm-4")
//  colorInputs.appendChild(unspecColorInput);
//  colorInputs.appendChild(colorInput);

//  // Add Settings page Label
//  if(labelText == null){
//    // No label also means inline warning needs to be set separately
//    return colorInputs;
//  } else {
//    const inputWithLabel = this.labelWrap({
//      "labelText": labelText,
//      "inputNode": colorInputs,
//      "forId": forId
//    });

//    return inputWithLabel;
//  }
// }