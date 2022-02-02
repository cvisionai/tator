import { TatorElement } from "../../components/tator-element.js";

export class AttributesForm extends TatorElement {
  constructor() {
    super();

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
      value: _default,  // create new el w/ this value 
      enumOptions: { choices, labels }
    });
    this._showDefault({ dtype });

    // use current
    this._getUseCurrent({ value: use_current });
    this._showUseCurrent({ dtype });

    // minimum
    this._getMinInput({ value: minimum });
    this._showMin({ dtype });

    // maximum
    this._getMaxInput({ value: maximum });
    this._showMax({ dtype });


    if (dtype == 'enum') {
      this.choicesVal = (choices === null) ? [] : choices;
      this.labelsVal = (labels === null) ? [] : labels;

      if (this.choicesVal.length != this.labelsVal.length) this._optionLengthEqual();

      // Choices only apply for enum types
      this._getChoicesInputs({ value: this.choicesVal });
      this._getLabelsInputs({ value: this.labelsVal });
      this._getEnumDefaultCol({ defaultVal: _default });
    }

    // if it is not dtype==enum it hides
    this._showEnumInputs({ dtype });

    return this.form;
  }

  _optionLengthEqual() {
    // make the array lengths equal
    if (this.choicesVal.length > this.labelsVal.length) {
      let labelsLength = this.labelsVal.length;
      for (const i of this.choicesVal) {
        if (i > labelsLength) {
          this.labelsVal.push("");
        }
      }
    } else if (this.choicesVal.length < this.labelsVal.length) {
      let choicesLength = this.choicesVal.length;
      for (const i of this.labelsVal) {
        if (i > choicesLength) {
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
    if (dtype != "Select" && dtype != "enum") {
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

  _showEnumInputs({ dtype } = {}) {
    if (dtype == 'enum') {
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
    if (this.placeholderDefault.children.length > 0) {
      this.placeholderDefault.innerHTML = ""; // @TODO best practice to remove all children?
      this._default = null;
    }

    // this will be a slider true/false - false == default // tmp removing this to allow for unset
    // if (dtype == "bool") {
    //   this._default = document.createElement("bool-input");
    //   this.placeholderDefault.appendChild(this._default);
    //   this._default.setAttribute("name", "Default");

    //   this._default.setAttribute("on-text", "Yes");
    //   this._default.setAttribute("off-text", "No");
    //   this._default.default = value;
    //   this._default.setValue(value);

    //   this._default.addEventListener("change", this._formChanged.bind(this));
    // } else
    if (dtype == "enum") {
      // enum default set in place, hide default input
      this.placeholderDefault.classList.add("hidden");
      this._default = document.createElement("text-input");
      this.placeholderDefault.appendChild(this._default);
      return;
    } else {
      this._default = document.createElement("text-input");
      this.placeholderDefault.appendChild(this._default);
      this._default.setAttribute("name", "Default");

      // attribute endpoint converts to correct type
      this._default.setAttribute("type", "text");
      this._default.default = value;
      this._default.setValue(value);

      this._default.addEventListener("change", this._formChanged.bind(this));
    }



    return this._default;
  }

  _getUseCurrent({ value = "" } = {}) {
    if (this.placeHolderUseCurrent.children.length > 0) {
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

  _getMinInput({ value } = {}) {
    if (this.placeholderMin.children.length > 0) {
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

  _getMaxInput({ value } = {}) {
    if (this.placeholderMax.children.length > 0) {
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
    if (this.placeholderChoices.children.length > 0) {
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
      this.appendDefaultRow({ defaultFlag: false });
      this._labels._newInput("");
    });

    return this._choices
  }

  _getLabelsInputs({ value = [] } = {}) {
    if (this.placeholderLabels.children.length > 0) {
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
      this.appendDefaultRow({ defaultFlag: false });
      this._choices._newInput("");
    });

    return this._labels
  }

  _getEnumDefaultCol({ defaultVal }) {
    this._enumDefault = {};
    this._enumDefault.value = defaultVal;
    this._enumDefault.changed = false;

    if (this.placeholderEnum.children > 0) {
      this.placeholderEnum.innerHTML = "";
    }
    this.enumDefaultCol = document.createElement("div");
    this.enumDefaultCol.setAttribute("class", "col-2 float-left text-center");
    this.placeholderEnum.appendChild(this.enumDefaultCol);

    let _name = document.createTextNode("Default");
    this.enumDefaultCol.appendChild(_name);

    if (this.choicesVal && this.choicesVal.length > 0) {
      for (let val of this.choicesVal) {
        let defaultFlag = (val == this._enumDefault.value) ? true : false;
        this.appendDefaultRow({ defaultFlag });
      }
    }
  }

  //
  appendDefaultRow({ defaultFlag = false } = {}) {
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
    if (this.dataTypeSelectDiv.children.length > 0) {
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
      this.addWarningWrap(this._dtype.label, this.dataTypeSelectDiv, this._dtype._select, false);
      this._dtype._select.dispatchEvent(new CustomEvent("input-caution", {
        "detail":
          { "errorMsg": `Warning: ${dtype} to ${newType} is not reversible.` }
      }));

    } else if (this._reversibleCheck({ dtype, newType })) {
      this.addWarningWrap(this._dtype.label, this.dataTypeSelectDiv, this._dtype._select, false);
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

  /**
  * This will check for changed inputs, but some are required for patch call
  * POST - Only required and if changed; UNLESS it is a clone, then pass all values
  * PATCH - Only required and if changed
  * 
  * Required: (See: _check_attribute_type in attribute_type.py)
  * - Name
  * - Dtype
  * - Choices (if Dtype == Enum)
  * - Default (if Dtype Changes and it isn't null will be validated - leave null if it is "")
  * 
  * 
  * @returns {formData} as JSON object
  */
  _getAttributeFormData() {
    const formData = {};

    // Name: Always sent
    formData.name = this._name.getValue();

    // Description: Only when changed, or when it is a Clone pass the value along
    // Don't send if the value is null => invalid
    if ((this._description.changed() || this.isClone) && this._description.getValue() !== null) {
      formData.description = this._description.getValue();
    }

    // Order: Only when changed, or when it is a Clone pass the value along
    // Don't send if the value is null => invalid
    if ((this._order.changed() || this.isClone) && this._order.getValue() !== null) {
      formData.order = this._order.getValue();
    }

    // Required: Only when changed, or when it is a Clone pass the value along
    if ((this._required.changed() || this.isClone)) {
      formData.required = this._required.getValue();
    }

    // Visible: Only when changed, or when it is a Clone pass the value along
    if ((this._visible.changed() || this.isClone)) {
      formData.visible = this._visible.getValue();
    }

    // Dtype: Always sent
    formData.dtype = this._dtype.getValue();
    const dtype = this._dtype.getValue();

    // Default: Send if changed, or if dtype changed (so it can be set to correct type) or if this is a clone
    // Don't send if the value is null => invalid
    // Don't send "" because it will fail as valid type for the default in some cases
    // - String: can be ""
    // - Int, or Float: Don't convert "" to Number or it will be 0; #TODO BUG backend will not allow "" -> Invalid attribute value for float attribute; Invalid attribute value for integer attribute
    // - 
    if (dtype !== "enum" && (this.isClone || this._dtype.changed() || this._default.changed())) {
      // check enum.default.changed value
      if (this._default.getValue() !== null) { //&& this._default.getValue() !== ""
        let defaultVal = this._default.getValue();

        // backend does this but not when value is ""
        if ((dtype == "int" || dtype == "float")) { // #TODO see above error on backend, etc... && defaultVal !== ""
          defaultVal = Number(defaultVal);
          formData["default"] = defaultVal;
        } else if (dtype == "datetime" && defaultVal != "" && this._useCurrent.getValue() != true) {
          formData["default"] = defaultVal;
        } else if (dtype == "geopos" && defaultVal != "") {
          formData["default"] = defaultVal;
        } else if (dtype == "bool" && (defaultVal.toLowerCase().trim() == "false" || defaultVal.toLowerCase().trim() == "true")) {
          defaultVal = defaultVal.toLowerCase().trim();
          formData["default"] = defaultVal;
        } else if (dtype != "bool" && dtype != "datetime" && dtype != "geopos") { // these must me the cases above
          formData["default"] = defaultVal;
        }
      }
    }

    // Datetime: Only when changed, or when it is a Clone pass the value along
    if (dtype === "datetime") {
      if (this._useCurrent.changed() || this.isClone) {
        formData.use_current = this._useCurrent.getValue();
      }
    }

    // Min and Max:
    // Only dtype in numeric & (changed, or when it is a Clone pass the value along)
    // Don't send if the value is null => invalid
    // #TODO does this have the same issue with ""?
    if (dtype === "int" || dtype === "float") {
      // getValue for text-input int comes back as null when default is undefined bc it is NaN
      if ((this._minimum.changed() || this.isClone) && this._minimum.getValue() !== null) {
        formData.minimum = Number(this._minimum.getValue());
      }
      if ((this._maximum.changed() || this.isClone) && this._maximum.getValue() !== null) {
        formData.maximum = Number(this._maximum.getValue());
      }
    }

    // ENUM Choices & Labels: (For now always sending both)
    // - Always send CHOICES with dtype enum #todo why? (this was in place before I saw labels getting erased #todo)
    // - If you don't send LABELS and you save a default it gets wiped out #todo why?
    // There is also an issue losing the default value if the choices, or labels are updated (moving enum default here
    // 
    if (dtype === "enum") {

      if ((this.isClone || this._dtype.changed() || this._enumDefault.changed || this._choices.changed() || this._labels.changed()) && this._enumDefault.value !== null) { //&& this._enumDefault.value !== ""
        formData["default"] = this._enumDefault.value;
      }

      // if ((this._choices.changed() || )) {
      formData.choices = this._choices.getValue();
      // }

      // if ((this._labels.changed() || this.isClone)) {
      formData.labels = this._labels.getValue();
      // }
    }
    // console.log(formData);
    return formData;
  }

  addWarningWrap(labelWrap, labelDiv, inputNode, checkErrors = true) {

    if (labelDiv.querySelector('.warning-row')) {
      labelDiv.querySelector('.warning-row').remove();
    }
    // Warning Message Spot
    let warningRow = document.createElement("div");
    warningRow.setAttribute("class", "warning-row offset-lg-4 col-lg-8 pb-3");
    labelDiv.appendChild(warningRow);

    const warning = new InlineWarning();
    warningRow.appendChild(warning.div());

    // Dispatch events to validate, and listen for errors
    if (checkErrors) {
      inputNode.addEventListener("input", (e) => {
        let hasError = this.validate.findError(inputNode.name, inputNode.value);
        if (hasError) {
          let errorEvent = new CustomEvent("input-invalid", {
            "detail":
              { "errorMsg": hasError }
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

  _attributeFormData({ form = this.form, id = -1, entityType = null } = {}) {
    const data = {};
    const global = this.isGlobal() ? "true" : "false";
    const formData = {
      "entity_type": entityType,
      "global": global,
      "old_attribute_type_name": this.dataset.oldName,
      "new_attribute_type": this._getAttributeFormData(form)
    };

    data.newName = this._name.getValue();
    data.oldName = this.dataset.oldName;
    data.formData = formData;

    return data;
  }

  async _getPromise({ form = this.form, id = -1, entityType = null } = {}) {
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
    this.form.classList.remove("changed");
    this.changeReset();

    promiseInfo.promise = await this._fetchAttributePatchPromise(id, formData);

    return promiseInfo;
  }


}

customElements.define("attributes-form", AttributesForm);
