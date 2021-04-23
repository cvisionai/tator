class AttributesForm extends TatorElement {
  constructor() {
    super();

    // Required helpers.
    this.inputHelper = new SettingsInput("media-types-main-edit");

    // Flag values
    this._changed = false;
    this._global = false;
  }

  set changed(val) {
    this.dispatchEvent(new Event("change"));
    return this._changed = val;
  }

  set global(val) {
    return this._global = val;
  }

  isChanged() {
    return this._changed;
  }

  isGlobal() {
    return this._global;
  }

  changeReset() {
    return this._changed = false;
  }

  globalReset() {
    return this._global = false;
  }

  _initEmptyForm() {
    const form = document.createElement("form");
    this.form = form;

    this.form.addEventListener("change", this._formChanged.bind(this));
    // this.form.addEventListener("change", (event) => {
    //   console.log("Attribute form changed");
    //   this.changed = true;
    //   return this.form.classList.add("changed");
    // });   


    // Fields for this form
    // name
    this._name = document.createElement("text-input");
    this._name.setAttribute("name", "Name");
    this._name.setAttribute("type", "string");
    this._name.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._name);

    // dtype
    /* the selection will change based on current value */
    this.dataTypeSelectDiv = document.createElement("div");
    this.form.appendChild(this.dataTypeSelectDiv);

    this._getDtypeSelectBox("");
    this.dataTypeSelectDiv.appendChild(this._dtype);
    
    this._dtype.addEventListener("change", this._formChanged.bind(this));

    // default
    /* input inside placeholder hidden until dtype selected */
    this.placeholderDefault = document.createElement("div");
    this.placeholderDefault.setAttribute("class", "hidden");
    this.form.appendChild(this.placeholderDefault);

    // use current
    /* input inside placeholder hidden until dtype selected */
    this.placeHolderUseCurrent = document.createElement("div");
    this.placeHolderUseCurrent.setAttribute("class", "hidden");
    this.form.appendChild(this.placeHolderUseCurrent);

    // description
    this._description = document.createElement("text-input");
    this._description.setAttribute("type", "string");
    this._description.setAttribute("name", "Description");
    this._description.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._description);

    // order
    this._order = document.createElement("text-input");
    this._order.setAttribute("name", "Order");
    this._order.setAttribute("type", "int");
    this._order.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._order);

    // required
    this._required = document.createElement("bool-input");
    this._required.setAttribute("name", "Required");
    this._required.setAttribute("on-text", "Yes");
    this._required.setAttribute("off-text", "No");
    this._required.setValue(false);
    this._required.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._required);

    // visible
    this._visible = document.createElement("bool-input");
    this._visible.setAttribute("name", "Visible");
    this._visible.setAttribute("on-text", "Yes");
    this._visible.setAttribute("off-text", "No");
    this._visible.setValue(false);
    this._visible.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._visible);

    // minimum
    /* input inside placeholder hidden until dtype selected */
    this.placeholderMin = document.createElement("div");
    this.placeholderMin.setAttribute("class", "hidden");
    this.form.appendChild(this.placeholderMin);

    // maximum
    /* input inside placeholder hidden until dtype selected */
    this.placeholderMax = document.createElement("div");
    this.placeholderMax.setAttribute("class", "hidden");
    this.form.appendChild(this.placeholderMax);

    // enum inputs @todo this can replace separate labels & choices
    this.placeholderEnum = document.createElement("div");
    this.placeholderEnum.setAttribute("class", "hidden clear-fix");

    const labelHolder = document.createElement("div");
    labelHolder.setAttribute("class", "col-4 col-modal-12 float-left");
    const enumLabel = document.createTextNode("Enum Choices");
    labelHolder.appendChild(enumLabel);

    this.placeholderEnum.appendChild(labelHolder);
    this.form.appendChild(this.placeholderEnum);


    // labels
    /* input inside placeholder hidden until dtype selected */
    this.placeholderLabels = document.createElement("div");
    this.placeholderLabels.setAttribute("class", "col-3 col-modal-5 float-left");
    this.placeholderEnum.appendChild(this.placeholderLabels);

    // choices
    /* input inside placeholder hidden until dtype selected */
    this.placeholderChoices = document.createElement("div");
    this.placeholderChoices.setAttribute("class", "col-3 col-modal-5 float-left");
    this.placeholderEnum.appendChild(this.placeholderChoices);


    this._shadow.appendChild(this.form);

    return this.form;
  }

  _formChanged() {
    console.log("Attribute form changed");
    this.changed = true;
    return this.form.classList.add("changed");
  }

  _getFormWithValues({
    clone = false,
    name = null,
    description = null,
    required = false,
    visible = false,
    dtype = null,
    order = null,
    _default = "", // keep this
    use_current = null,
    minimum = null,
    maximum = null,
    choices = [],
    labels = []
  } = {}) {

    // do we want to save all the data shown
    this.isClone = clone;

    // gets attribute object as param destructured over these values
    //sets value on THIS form
    this.form = this._initEmptyForm();

    /* fields that are always available */
    // Set Name
    this._name.default = name;
    this._name.setValue(name);

    // Set description
    this._description.default = description;
    this._description.setValue(description);

    // Set order
    this._order.default = order;
    this._order.setValue(order);

    // required
    this._required.default = required;
    this._required.setValue(required);

    // visible
    this._visible.default = visible;
    this._visible.setValue(visible);

    /* fields that are dynamic */
    // dtype is reset
    this._getDtypeSelectBox(dtype);

    // default depends on dtype so use this method
    this._getDefaultInput({
      dtype,
      value : _default,  // create new el w/ this value 
      enumOptions: { choices, labels }
    });
    this._showDefault({ dtype });

    // use current
    this._getUseCurrent({ value : use_current });
    this._showUseCurrent({ dtype });

    // minimum
    this._getMinInput({ value : minimum });
    this._showMin({ dtype });

    // maximum
    this._getMaxInput({ value : maximum });
    this._showMax({ dtype });


    if (dtype == 'enum'){
      this.choicesVal = choices;
      this.labelsVal = labels;
      if(choices.length != labels.length) this._optionLengthEqual();

      // Choices only apply for enum types
      this._getChoicesInputs({ value : this.choicesVal });
      this._getLabelsInputs({ value : this.labelsVal });
      this._getEnumDefaultCol({ defaultVal : _default});
    }
    
    // if it is not dtype==enum it hides
    this._showEnumInputs({ dtype });

    return this.form;
  }

  _optionLengthEqual(){
    // make the array lengths equal
    if(this.choicesVal.length > this.labelsVal.length){
      let labelsLength = this.labelsVal.length;
      for(const i of this.choicesVal){
        if(i > labelsLength){
          this.labelsVal.push("");
        }
      }
    } else if(this.choicesVal.length < this.labelsVal.length){
      let choicesLength = this.choicesVal.length;
      for(const i of this.labelsVal){
        if(i > choicesLength){
          this.choicesVal.push("");
        }
      }
    }
  }

  /* 
   * These control the hide/show of the inputs
   *  {@param} dtype required
   *  if the input has not been init, creates it as empty 
   */
  _showDefault({ dtype } = {}) {
    if(dtype != "Select" && dtype != "enum"){
      if (typeof this._default == "undefined" || this._default == null) {
        this._getDefaultInput({ dtype }); // requires dtype
      }
    
      //this._default.setAttribute("data-ignore", "false");
      this.placeholderDefault.classList.remove("hidden");
    } else {
      // this flag allows us not to delete a users value if 
      // they toggle dtype, but if it is true we don't try to PATCH it
      //if(this._default) this._default.setAttribute("data-ignore", "true");
      this.placeholderDefault.classList.add("hidden");
    }
  }

  _showUseCurrent({ dtype } = {}) {
    if (dtype == 'datetime') {
      if (typeof this._useCurrent == "undefined") {
        this._getUseCurrent({});
      }

      this.placeHolderUseCurrent.classList.remove("hidden");
    } else {
      this.placeHolderUseCurrent.classList.add("hidden");
    }
  }

  _showMin({ dtype } = {}) {
    if (dtype == 'int' || dtype == 'float') {
      if (typeof this._minimum == "undefined" || this._minimum == null) {
        this._getMinInput({});
      }

      this.placeholderMin.classList.remove("hidden");
    } else {
      this.placeholderMin.classList.add("hidden");
    }
  }

  _showMax({ dtype } = {}) {
    if (dtype == 'int' || dtype == 'float') {
      if (typeof this._maximum == "undefined" || this._maximum == null) {
        this._getMaxInput({});
      }

      this.placeholderMax.classList.remove("hidden");
    } else {
      this.placeholderMax.classList.add("hidden");
    }
  }

  _showEnumInputs({ dtype } = {}){
    if ( dtype == 'enum' ) {
      if (typeof this._choices == "undefined" || this._choices == null) {
        this._getLabelsInputs({});
        this._getChoicesInputs({});
        this._getEnumDefaultCol({});
      }

      this.placeholderEnum.classList.remove("hidden");
    } else {
      this.placeholderEnum.classList.add("hidden");
    }
  }

  /* 
   * These control the hide/show of the inputs
   *  {@param} dtype required for get default ONLY
   *  {@param} value is optional
   */
  _getDefaultInput({
    dtype, // required
    value = "", // keep this
  }) {
    if(this.placeholderDefault.children.length > 0){
      this.placeholderDefault.innerHTML = ""; // @TODO best practice to remove all children?
      this._default = null;
    }

    // this will be a slider true/false - fale == default
    if (dtype == "bool") {
      this._default = document.createElement("bool-input");
      this.placeholderDefault.appendChild(this._default);
      this._default.setAttribute("name", "Default");

      this._default.setAttribute("on-text", "Yes");
      this._default.setAttribute("off-text", "No");
    } else if (dtype == "enum") {
      // enum default set in place, hide default input
      this.placeholderDefault.classList.add("hidden");
      return;
    } else {
      this._default = document.createElement("text-input");
      this.placeholderDefault.appendChild(this._default);
      this._default.setAttribute("name", "Default");

      // attribute endpoint converts to correct type
      this._default.setAttribute("type", "text")
    }

    this._default.default = value;
    this._default.setValue(value);

    this._default.addEventListener("change", this._formChanged.bind(this));

    return this._default;
  }

  _getUseCurrent({ value = "" } = {}) {
    if(this.placeHolderUseCurrent.children.length > 0){
      this.placeHolderUseCurrent.innerHTML = "";
      this._useCurrent = null;
    }

    this._useCurrent = document.createElement("bool-input");
    this.placeHolderUseCurrent.appendChild(this._useCurrent);

    this._useCurrent.setAttribute("name", "Use Current As Default");
    this._useCurrent.setAttribute("on-text", "Yes");
    this._useCurrent.setAttribute("off-text", "No");
    this._useCurrent.default = value;
    this._useCurrent.setValue(value);

    this._useCurrent.addEventListener("change", this._formChanged.bind(this));

    return this._useCurrent;
  }

  _getMinInput({ value = "" } = {}) {
    if(this.placeholderMin.children.length > 0){
      this.placeholderMin.innerHTML = "";
      this._minimum = null;
    }

    this._minimum = document.createElement("text-input");
    this.placeholderMin.appendChild(this._minimum);

    this._minimum.setAttribute("name", "Minimum");
    this._minimum.setAttribute("type", "int");
    this._minimum.default = value;
    this._minimum.setValue(value);

    this._minimum.addEventListener("change", this._formChanged.bind(this));

    return this._minimum;
  }

  _getMaxInput({ value = "" } = {}) {
    if(this.placeholderMax.children.length > 0){
      this.placeholderMax.innerHTML = "";
      this._maximum = null;
    }

    this._maximum = document.createElement("text-input");
    this.placeholderMax.appendChild(this._maximum);

    this._maximum.setAttribute("name", "Maximum");
    this._maximum.setAttribute("type", "int");
    this._maximum.default = value;
    this._maximum.setValue(value);

    this._maximum.addEventListener("change", this._formChanged.bind(this));

    return this._maximum;
  }

  _getChoicesInputs({ value = [] } = {}) {
    if(this.placeholderChoices.children.length > 0){
      this.placeholderChoices.innerHTML = "";
      this._choices = null;
    }

    this._choices = document.createElement("array-input");
    this.placeholderChoices.appendChild(this._choices);

    this._choices.setAttribute("name", "Value");
    this._choices.default = value;
    this._choices.setValue(value);

    this._choices.addEventListener("change", this._formChanged.bind(this));
    this._choices.addEventListener("new-input", () => {
      this.appendDefaultRow();
      this._labels._newInput("");
    });

    return this._choices
  }

  _getLabelsInputs({ value = [] } = {}) {
    if(this.placeholderLabels.children.length > 0){
      this.placeholderLabels.innerHTML = "";
      this._labels = null;
    }

    this._labels = document.createElement("array-input");
    this.placeholderLabels.appendChild(this._labels);

    this._labels.setAttribute("name", "Label");
    this._labels.default = value;
    this._labels.setValue(value);

    this._labels.addEventListener("change", this._formChanged.bind(this));
    this._labels.addEventListener("new-input", () => {
      this.appendDefaultRow();
      this._choices._newInput("");
    });

    return this._labels
  }

  _getEnumDefaultCol({defaultVal}){
    this._enumDefault = {};
    this._enumDefault.value = defaultVal;
    this._enumDefault.changed = false;

    if(this.placeholderEnum.children > 0) {
      this.placeholderEnum.innerHTML = "";
    }
    this.enumDefaultCol = document.createElement("div");
    this.enumDefaultCol.setAttribute("class","col-2 float-left text-center");
    this.placeholderEnum.appendChild(this.enumDefaultCol);

    let _name = document.createTextNode("Default");
    this.enumDefaultCol.appendChild(_name);

    if (this.choicesVal && this.choicesVal.length > 0) {
      for(let val of this.choicesVal){
        let defaultFlag = (val == this._enumDefault.value) ? true : false;
        this.appendDefaultRow({defaultFlag});
      }
    }
  }

  //
  appendDefaultRow({defaultFlag}){
    let currentDefault = document.createElement("input");
    currentDefault.setAttribute("class", "radio")
    currentDefault.setAttribute("type", "radio");
    currentDefault.setAttribute("name", "enum-default");
    currentDefault.checked = defaultFlag;
    this.enumDefaultCol.appendChild(currentDefault);

    currentDefault.addEventListener("change", () => {
      const child = currentDefault;
      const parent = child.parentNode;
      const index = Array.prototype.indexOf.call(parent.children, child);
      //console.log( "New enum default : " + this._choices._inputs[index].getValue() );
      this._enumDefault.value = this._choices._inputs[index].getValue();
      this._enumDefault.changed = true;
    });

  }

  //
  _showDynamicFields(dtype) {
    this._getDefaultInput({ dtype });
    this._showDefault({ dtype });
    this._showUseCurrent({ dtype });
    this._showMin({ dtype });
    this._showMax({ dtype });
    this._showEnumInputs({ dtype });
    // this._showChoices({ dtype });
    // this._showLabels({ dtype });
  }

  _getDtypeSelectBox(dtype) {
    // remove options if the exist
    if(this.dataTypeSelectDiv.children.length > 0) {
      this.dataTypeSelectDiv.innerHTML = "";
      this._dtype = null;
    }

    // create the dtype input
    this._dtype = document.createElement("enum-input");
    this.dataTypeSelectDiv.appendChild(this._dtype);
    this._dtype.setAttribute("name", "Data Type")

    // If we have a value
    // - it was via FETCH so actions = edit
    // - listener shows warnings & dynamic fields (in some cases)
    if (dtype != "" && typeof dtype != "undefined" && dtype != null) {
      // Get the allowed options.
      const allowedOptions = this._getAllowedDTypeArray(dtype);

      // add options based on dtype and set value
      this._dtype.choices = this._getFormattedOptions(allowedOptions);
      this._dtype.default = dtype;
      this._dtype.setValue(dtype);

      this._dtype.addEventListener("change", (e) => {
        this._formChanged();
        // get new type, and check fields are all OK
        let newType = this._dtype.getValue();
        this._showDynamicFields(newType);

        // when changed check if we need to show a warning.
        this._dispatchWarningEvents({ dtype, newType });
      });

    } else {
      // ELSE there was no prior value user is selecting dtype for the first time
      // Listener will reveal the correct fields
      const options = this._setAttributeDTypes();
      options.push("Select"); // allow nothing selected

      this._dtype.choices = this._getFormattedOptions(options);
      this._dtype.setValue("Select");
      this._dtype.default = "Select";

      // On change the form will need to change fields.
      this._dtype.addEventListener("change", (e) => {
        this._formChanged();
        let newType = this._dtype.getValue();
        // warning div not required for new dtype selections
        this._showDynamicFields(newType);
      });
    }

    return this._dtype;
  }

  _dispatchWarningEvents({ dtype, newType }) {
    if (this._irreversibleCheck({ dtype, newType })) {
      this.inputHelper.addWarningWrap(this._dtype.label, this.dataTypeSelectDiv, this._dtype._select, false);
      this._dtype._select.dispatchEvent(new CustomEvent("input-caution", {
        "detail":
          { "errorMsg": `Warning: ${dtype} to ${newType} is not reversible.` }
      }));

    } else if (this._reversibleCheck({ dtype, newType })) {
      this.inputHelper.addWarningWrap(this._dtype.label, this.dataTypeSelectDiv, this._dtype._select, false);
      this._dtype._select.dispatchEvent(new CustomEvent("input-caution", {
        "detail":
          { "errorMsg": `Warning: ${dtype} to ${newType} may cause data loss.` }
      }));

    } else {
      let successEvent = new CustomEvent("input-valid");
      this._dtype._select.dispatchEvent(successEvent);
    }
  }

  _setAttributeDTypes() {
    this.attributeDTypes = ["bool", "int", "float", "enum", "string", "datetime", "geopos"];
    return this.attributeDTypes;
  }

  _getDTypeRules() {
    return ({
      "bool": {
        "allowed": ["enum", "string"],
        "fully-reversible": [],
        "reversible-with-warning": [],
        "irreversible": ["enum", "string"]
      },
      "int": {
        "allowed": ["float", "enum", "string"],
        "fully-reversible": ["float"],
        "reversible-with-warning": [],
        "irreversible": ["enum", "string"]
      },
      "float": {
        "allowed": ["int", "enum", "string"],
        "fully-reversible": [],
        "reversible-with-warning": ["int"],
        "irreversible": ["enum", "string"]
      },
      "enum": {
        "allowed": ["string"],
        "fully-reversible": ["string"],
        "reversible-with-warning": [],
        "irreversible": []
      },
      "string": {
        "allowed": ["enum"],
        "fully-reversible": ["enum"],
        "reversible-with-warning": [],
        "irreversible": []
      },
      "datetime": {
        "allowed": ["enum", "string"],
        "fully-reversible": [],
        "reversible-with-warning": [],
        "irreversible": ["enum", "string"]
      },
      "geopos": {
        "allowed": ["enum", "string"],
        "fully-reversible": [],
        "reversible-with-warning": [],
        "irreversible": ["enum", "string"]
      }
    });
  }

  _getAllowedDTypeArray(dtype) {
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[dtype].allowed;
    //include itself
    ruleSetForDtype.push(dtype);

    return ruleSetForDtype;
  }

  _reversibleCheck({ dtype = "", newType = "" } = {}) {
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[dtype]['reversible-with-warning'];

    return ruleSetForDtype.includes(newType);
  }

  _irreversibleCheck({ dtype = "", newType = "" } = {}) {
    let allRules = this._getDTypeRules();
    let ruleSetForDtype = allRules[dtype].irreversible;

    return ruleSetForDtype.includes(newType);
  }

  _getFormattedOptions(typeArray) {
    return typeArray.map((i) => {
      return ({ "label": i, "value": i });
    });
  }

  // Use this to set choices if you have the arrays
  _getFormattedEnumOptions({ choices, labels }) {
    return choices.map((choice, i) => {
      if (labels[i] != null) {
        return { value: choice, label: labels[i] }
      } else {
        return { value: choice }
      }
    });
  }

  _getAttributeFormData() {
    const formData = {};

    // always send name (re: _check_attribute_type)
    formData.name = this._name.getValue();

    // 
    if ((this._description.changed()  || this.isClone)) {
      formData.description = this._description.getValue();
    }

    //
    if ((this._order.changed()  || this.isClone)) {
      formData.order = this._order.getValue();
    }

    //
    if ((this._required.changed() || this.isClone)) {
      formData.required = this._required.getValue();
    }

    //
    if ((this._visible.changed() || this.isClone)) {
      formData.visible = this._visible.getValue();
    }

    // always send (re: _check_attribute_type)
    formData.dtype = this._dtype.getValue();
    const dtype = this._dtype.getValue();

    if(dtype === "enum"){
      if ((this._enumDefault.changed || this.isClone)) {
        formData["default"] = this._enumDefault.value;
      }
    } else {
      if ((this._default.changed() || this.isClone)) {
        formData["default"] = this._default.getValue();
      }
    }

    if (dtype === "datetime") {
      if (this._useCurrent.changed()) {
        formData.use_current = this._useCurrent.getValue();
      }
    }
    

    // 
    if (dtype === "int" || dtype === "float") {
      if ((this._minimum.changed() || this.isClone)) {
        formData.minimum = Number(this._minimum.getValue());
      }
      if ((this._maximum.changed() || this.isClone)) {
        formData.maximum = Number(this._maximum.getValue());
      }
    }

    if (dtype === "enum") {
      // always send (re: _check_attribute_type)
      formData.choices = this._choices.getValue();

      if ((this._labels.changed() || this.isClone)) {
        formData.labels = this._labels.getValue();
      }
    }

    return formData;
  }

  _getPromise({ form = this.form, id = -1, entityType = null } = {}) {
    const promiseInfo = {};
    const global = this.isGlobal() ? "true" : "false";
    const formData = {
      "entity_type": entityType,
      "global": global,
      "old_attribute_type_name": this.dataset.oldName,
      "new_attribute_type": {}
    };

    promiseInfo.newName = this._name.getValue();
    promiseInfo.oldName = this.dataset.oldName;

    // console.log("formData");
    // console.log(formData);

    // Hand of the data, and call this form unchanged
    formData.new_attribute_type = this._getAttributeFormData(form);
    form.classList.remove("changed");
    this.changeReset();

    promiseInfo.promise = this._fetchAttributePatchPromise(id, formData);

    return promiseInfo;
  }

  _fetchAttributePatchPromise(parentTypeId, formData) {
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
