class AttributesForm extends HTMLElement {
  constructor() {
    super();

    // Required helpers.
    this.inputHelper = new SettingsInput("media-types-main-edit");

  }

  _initEmptyForm(){
    const form = document.createElement("form");
    this.form = form;

    //this.form.addEventListener("change", this._formChanged);
    this.form.addEventListener("change", (event) => {
      console.log("attribute form changed");
      console.log("Event target... "+event.target.value);
      return event.target.closest('form').classList.add("changed");
    });   


    // Fields for this form
    // append input for name
    const NAME = "Name";
    this.form.appendChild( this.inputHelper.inputText({
      "labelText" : NAME,
      "name" : NAME.toLowerCase(),
      "value" : ""
    }) );

    let dataTypeSelectDiv = document.createElement("div");
    dataTypeSelectDiv.setAttribute("class", "dataTypeSelectDiv");
    dataTypeSelectDiv.append( this._getDtypeSelectBox( "" ) );
    this.form.appendChild(dataTypeSelectDiv);

    // description
    const DESCRIPTION = "Description";
    this.form.appendChild( this.inputHelper.inputText( {
      "labelText" : DESCRIPTION,
      "name" : DESCRIPTION.toLowerCase(),
      "value" : ""
    } ) );

    // order
    const ORDER = "Order";
    this.form.appendChild( this.inputHelper.inputText( {
      "labelText" : ORDER,
      "name" : ORDER.toLowerCase(),
      "value" : 0,
      "type" : "number"
    } ) );

    // required
    const REQUIRED = "Required";
    let req_slideObj = this.inputHelper.inputRadioSlide({
      labelText : REQUIRED,
      name : REQUIRED.toLowerCase(),
      value : false,
      getSlide : true
    });
    this.req_slide = req_slideObj.slide;
    this.form.appendChild( req_slideObj.fieldset );

    // visible
    const VISIBLE = "Visible";
    let vis_slideObj = this.inputHelper.inputRadioSlide({
      labelText : VISIBLE,
      name : VISIBLE.toLowerCase(),
      value : false,
      getSlide : true
    });
    this.vis_slide = vis_slideObj.slide;
    this.form.appendChild( vis_slideObj.fieldset );

    // default
    this.form.appendChild( this._getDefaultInput( 0 ) );

    /*** @todo - The remaining are added when dtype is added or when values provided ***/
    // let placeholderDefault = document.createElement("div");
    // placeholderDefault.setAttribute("class", "placeholderDefault");
    // this.form.appendChild(placeholderDefault);

    let placeholderMin = document.createElement("div");
    placeholderMin.setAttribute("class", "placeholderMin");
    this.form.appendChild(placeholderMin);

    let placeholderMax = document.createElement("div");
    placeholderMax.setAttribute("class", "placeholderMax");
    this.form.appendChild(placeholderMax);

    let placeholderChoices = document.createElement("div");
    placeholderChoices.setAttribute("class", "placeholderChoices");
    this.form.appendChild(placeholderChoices);

    let placeholderLabels = document.createElement("div");
    placeholderLabels.setAttribute("class", "placeholderLabels");
    this.form.appendChild(placeholderLabels);

    return this.form;
  }

  // _formChanged(event){
  //   console.log("attribute form changed");
  //   console.log("Event target... "+event.target.value);
  //   return this.form.classList.add("changed");
  // }

  _getFormWithValues({
    name = "",
    description = "",
    required = "",
    visible = "",
    dtype = "",
    order = "",
    _default = "",
    minimum = "",
    maximum = "",
    choices = "",
    labels = ""
  } = {}){
    // gets attribute object as param destructured over these values
    //sets value on THIS form
    this.form = this._initEmptyForm();

    // These just require a value.
    this.form.querySelector(`input[name^="name"]`).value = name;
    this.form.querySelector(`input[name^="description"]`).value = description;
    this.form.querySelector(`input[name^="order"]`).value = order;
    //this.form.querySelector(`input[name^="required"]`).value = required;
    //this.form.querySelector(`input[name^="visible"]`).value = visible;
    this.form.querySelector(`input[name^="default"]`).value = _default;

    // Bools require value set differently
    this.req_slide.setValue( required );
    this.vis_slide.setValue( visible );

    // The dtype select & following fields changes on selection
    this.form.querySelector(`.dataTypeSelectDiv`).innerHTML = "";
    this.form.querySelector(`.dataTypeSelectDiv`).appendChild( this._getDtypeSelectBox( dtype ) );

    this._showMin(dtype, this._getMinInput( minimum ));
    this._showMax(dtype, this._getMaxInput( maximum ));

    this._showChoices(dtype, this._getChoicesInputs( choices ) );
    this._showLabels(dtype, this._getLabelsInputs( labels ));

    return this.form;
  }

  // _showDefault( dtype, _default =  this._getDefaultInput( "" ) ){
  //   let showDefault = (dtype != 'datetime' && dtype != 'geopos') ? true : false;
  //   if(showDefault){
  //     this.form.querySelector(`.placeholderDefault`).hidden = false;
  //
  //     if(!this.form.querySelector(`.placeholderDefault input`)){
  //       if(dtu)
  //       this.form.querySelector(`.placeholderDefault`).appendChild( _default );
  //     }
  //
  //   } else {
  //     this.form.querySelector(`.placeholderDefault`).hidden = true;
  //   }
  // }

  _showMin(dtype, minimum =  this._getMinInput( 0 )){
    let showMinMax = (dtype == 'int' || dtype == 'float') ? true : false;
    if(showMinMax){
      this.form.querySelector(`.placeholderMin`).hidden = false;
      if(!this.form.querySelector(`.placeholderMin input`)){
        this.form.querySelector(`.placeholderMin`).appendChild(  minimum  );
      }
    } else {
      this.form.querySelector(`.placeholderMin`).hidden = true;
    }
  }

  _showMax(dtype, maximum = this._getMaxInput( 0 )){
    let showMinMax = (dtype == 'int' || dtype == 'float') ? true : false;
    if(showMinMax){
      this.form.querySelector(`.placeholderMax`).hidden = false;
      if(!this.form.querySelector(`.placeholderMax input`)){
        this.form.querySelector(`.placeholderMax`).appendChild(  maximum  );
      }
    } else {
      this.form.querySelector(`.placeholderMax`).hidden = true;
    }
  }

  _showChoices(dtype, choices =  this._getChoicesInputs( [] ) ){
    let showChoiceAndLabels = dtype == 'enum' ? true : false;
    if(showChoiceAndLabels){
      this.form.querySelector(`.placeholderChoices`).hidden = false;
      if(!this.form.querySelector(`.placeholderChoices input`)){
        this.form.querySelector(`.placeholderChoices`).appendChild( choices );
      }
    } else {
      this.form.querySelector(`.placeholderChoices`).hidden = true;
    }
  }

  _showLabels(dtype, labels =  this._getLabelsInputs( [] ) ){
    let showChoiceAndLabels = dtype == 'enum' ? true : false;
    if(showChoiceAndLabels){
      this.form.querySelector(`.placeholderLabels`).hidden = false;
      if(!this.form.querySelector(`.placeholderLabels input`)){
        this.form.querySelector(`.placeholderLabels`).appendChild( labels );
      }
    } else {
      this.form.querySelector(`.placeholderLabels`).hidden = true;
    }
  }

  _getDefaultInput( value, dtype ){
    const DEFAULT = "Default";
    let defaultType = "text"
    if(dtype && dtype == "datetime") defaultType = "datetime-local";
    
    return this.inputHelper.inputText({
      "value" : value,
      "labelText" : DEFAULT,
      "name" : DEFAULT.toLowerCase(),
      "type" : defaultType
    } ) ;
  }

  _getMinInput( value ){
    const MIN = "Minimum";
    return this.inputHelper.inputText({
      "labelText" : MIN,
      "name" : MIN.toLowerCase(),
      "value" : value,
      "type" : "number" // number
    } );
  }

  _getMaxInput(value){
    const MAX = "Maximum";
    return this.inputHelper.inputText({
        "labelText" : MAX,
        "name" : MAX.toLowerCase(),
        "value" : value,
        "type" : "number" //number
      } );
  }

  _getChoicesInputs(value){
    const CHOICES = "Choices";
    return this.inputHelper.arrayInputText({
      "labelText": CHOICES,
      "name": CHOICES.toLowerCase(),
      "value": value,
      "type" : "text"
    } );
  }

  _getLabelsInputs(value){
    const LABELS = "Labels";
    return this.inputHelper.arrayInputText( {
      "labelText": LABELS,
      "name": LABELS.toLowerCase(),
      "value": value,
      "type" : "text" //number
    } );
  }

  _getDtypeFields(dtype){
    console.log("_getDtypeFields for " + dtype);

    // now based on DTYPE *** will reveal fields, or create them
    //this._showDefault(dtype);
    this._showMin(dtype);
    this._showMax(dtype);
    this._showChoices(dtype);
    this._showLabels(dtype);
  }

  _getDtypeSelectBox(dtype){
    let currentOption = dtype;
    let selectBox = "";
    let options = "";

    if(dtype != "" && typeof dtype != "undefined" && dtype != null){
      // Get the allowed options.
      options = this._getDtypeOptions( this._getAllowedDTypeArray(currentOption) );

      selectBox = this.inputHelper.inputSelectOptions({
        "labelText": "Data Type",
        "value": dtype,
        "optionsList": options,
        "name" : "dtype"
      });

      // Add placeholder for warning, and listen for change.
      let selectorInBox = selectBox.querySelector("select");
      selectorInBox.addEventListener("change", (e) => {
        //when changed check if we need to show a warning.
        let newType = e.target.value;
        let message = ""

        if(this._getIrreverasibleDTypeArray({ "currentDT": dtype, "newDT": newType})){
          message = `Warning: ${dtype} to ${newType} is not reversible.`;
          // Caution 
          let errorEvent = new CustomEvent("input-caution", {"detail" : 
            {"errorMsg" : message}
          });
          selectorInBox.dispatchEvent(errorEvent);
        } else if(this._getLossDTypeArray({ "currentDT": dtype, "newDT": newType})){
          message = `Warning: ${dtype} to ${newType} may cause data loss.`;
          // Caution 
          let errorEvent = new CustomEvent("input-caution", {"detail" : 
            {"errorMsg" : message}
          });
          selectorInBox.dispatchEvent(errorEvent);
        } else {
          // No probz
          let successEvent = new CustomEvent("input-valid");
          selectorInBox.dispatchEvent(successEvent);
        }

        // should hide and show them, do not remove data
        this._getDtypeFields(newType);
      });

    } else {
      // Show all, user is selecting dtype for the first time
      options = this._setAttributeDTypes();
      options.push("Select");

      selectBox = this.inputHelper.inputSelectOptions({
        "labelText": "Data Type",
        "value": "Select",
        "name" : "dtype",
        "optionsList": this._getDtypeOptions( options )
      });

      // On change the form will need to change fields.
      selectBox.addEventListener("change", (e) => {
        let newType = e.target.value;
        // should hide and show them, do not remove data
        this._getDtypeFields(newType);
      });

    }
    return selectBox;
  }

  _setAttributeDTypes(){
    this.attributeDTypes = [ "bool", "int", "float", "enum", "string", "datetime", "geopos"];
    return this.attributeDTypes;
  }

  _getDTypeRules(){
    return ( {
      "bool" : {
        "allowed": ["enum","string"],
        "fully-reversible": [],
        "reversible-with-warning": [],
        "irreversible": ["enum","string"]
      },
      "int" : {
        "allowed": ["float","enum","string"],
        "fully-reversible": ["float"],
        "reversible-with-warning": [],
        "irreversible": ["enum","string"]
      },
      "float" : {
        "allowed": ["int","enum","string"],
        "fully-reversible": [],
        "reversible-with-warning": ["int"],
        "irreversible": ["enum","string"]
      },
      "enum" : {
        "allowed": ["string"],
        "fully-reversible": ["string"],
        "reversible-with-warning": [],
        "irreversible": []
      },
      "string" : {
        "allowed": ["enum"],
        "fully-reversible": ["enum"],
        "reversible-with-warning": [],
        "irreversible": []
      },
      "datetime" : {
        "allowed": ["enum","string"],
        "fully-reversible": [],
        "reversible-with-warning": [],
        "irreversible": ["enum","string"]
      },
      "geopos" : {
        "allowed": ["enum","string"],
        "fully-reversible": [],
        "reversible-with-warning": [],
        "irreversible": ["enum","string"]
      }
    });
  }

  _getAllowedDTypeArray(dtype){
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[dtype].allowed;
    //include itself
    ruleSetForDtype.push(dtype);

    return ruleSetForDtype;
  }

  _getLossDTypeArray({ currentDT = "", newDT = ""} = {}){
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[currentDT]['reversible-with-warning'];

    return ruleSetForDtype.includes(newDT);
  }

  _getIrreverasibleDTypeArray({ currentDT = "", newDT = ""} = {}){
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[currentDT].irreversible;

    return ruleSetForDtype.includes(newDT);
  }

  _getDtypeOptions(typeArray){
    return typeArray.map( (i) => {
      return ({ "optText": i, "optValue": i });
    });
  }

  _getAttributeFormData(form){
    // name only if changed || can not be "" 
    let name = form.querySelector('[name="name"]').value;

    let description = form.querySelector('[name="description"]').value;

    let order = Number(form.querySelector('[name="order"]').value);

    let requiredInputs =  form.querySelectorAll('.radio-slide-wrap input[name="required"]');
    let required = this.inputHelper._getSliderSetValue(requiredInputs);

    let visibleInputs =  form.querySelectorAll('.radio-slide-wrap input[name="visible"]');
    let visible = this.inputHelper._getSliderSetValue(visibleInputs);

    let formData = {
      name,
      description,
      order,
      required,
      visible
    };

    // only send dtype when it's new, if included cannot be ""
    let dtypeSelect = form.querySelector('[name="dtype"]');
    let dtype = dtypeSelect.value;
    if(dtype !== "" || dtype !== null) {
      // Set dtype
      formData.dtype = dtype;

      // Fields that rely on dtype
      let _default = this._makeDefaultCorrectType(dtype, form.querySelector('[name="default"]').value);
      formData["default"] = _default;

      if(dtype === "int" || dtype === "float"){
        let minimum = Number(form.querySelector('[name="minimum"]').value);
        formData["minimum"] = minimum;
  
        let maximum = Number(form.querySelector('[name="maximum"]').value);
        formData["maximum"] = maximum;
      }
  
      if(dtype === "enum"){
        let choicesInputs =  form.querySelectorAll('input[name="choices"]');
        let choices = this.inputHelper._getArrayInputValue(choicesInputs);
        formData["choices"] = choices;
  
        let labelsInputs =  form.querySelectorAll('input[name="labels"]');
        let labels = this.inputHelper._getArrayInputValue(labelsInputs);
        formData["labels"] = labels;
      }

    }
    
    console.log(formData);
    return formData;
  }



  _makeDefaultCorrectType(dtype, _defaultVal){
    let _default = _defaultVal;
    console.log(_defaultVal);
    try{
      if(dtype == "bool"){
        _default = Boolean(_defaultVal);
      } else if (dtype == "int" || dtype == "float" || dtype == "datetime" || dtype == "geopos") {
        _default = Number(_defaultVal);
      } else {
        _default = String(_defaultVal);
      }
    }catch(e){
      console.log("Error dtype casting default: "+e);
    }

    return _default;
  }
  _getAttributePromises({id = -1, entityType = null, attrForms = [], attrFormsChanged = []} = {}){
    let attrPromises = {};
    attrPromises.promises = [];
    attrPromises.attrNamesNew = [];
    attrPromises.attrNames = [];

    if(attrFormsChanged && attrFormsChanged.length > 0){
      attrFormsChanged.forEach((form, i) => {
        let global = String(form.dataset.isGlobal) == "true" ? "true" : "false";
        let formData = {
          "entity_type": entityType,
          "global" : global,
          "old_attribute_type_name": form.dataset.oldName,
          "new_attribute_type": {}
        };

        let attrNameNew = form.querySelector('input[name="name"]').value;
        attrPromises.attrNamesNew.push(attrNameNew);

        let attrNameOld = form.dataset.oldName;
        attrPromises.attrNames.push(attrNameOld);

        formData.new_attribute_type = this._getAttributeFormData(form);
        form.classList.remove("changed");

        let currentPatch = this._fetchAttributePatchPromise(id, formData);
        attrPromises.promises.push(currentPatch);
       
      });
      return attrPromises;
    }
  }

  _fetchAttributePatchPromise(parentTypeId, formData){
    return fetch("/rest/AttributeType/" + parentTypeId, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });
  }
}

customElements.define("attributes-form", AttributesForm);
