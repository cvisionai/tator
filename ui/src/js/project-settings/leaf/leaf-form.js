import { TatorElement } from "../../components/tator-element.js";

export class LeafForm extends TatorElement {
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

  async _initEmptyForm(leaves) {
    const form = document.createElement("form");
    this.form = form;

    this.form.addEventListener("change", this._formChanged.bind(this));
    // this.form.addEventListener("change", (event) => {
    //   console.log("Leaf form changed");
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

    // READ ONLY : path
    this._path = document.createElement("text-input");
    this._path.setAttribute("name", "Path");
    this._path.permission = "View Only";
    this._path.setAttribute("type", "string");
    this._path.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._path);

    // Parent
    this._parent = this._getParentSelect(leaves);
    this.form.appendChild(this._parent);
    
    this._shadow.appendChild(this.form);

    return this.form;
  }

  _formChanged() {
    console.log("Leaf form changed");
    this.changed = true;
    return this.form.classList.add("changed");
  }

  _getFormWithValues({
    clone = false,
    name = null,
    path = null,
    parent = null,
  } = {}) {

    // do we want to save all the data shown
    this.isClone = clone;

    // gets leaf object as param destructured over these values
    //sets value on THIS form
    this.form = this._initEmptyForm();

    /* fields that are always available */
    // Set Name
    this._name.default = name;
    this._name.setValue(name);

    // Set path
    this._path.default = path;
    this._path.setValue(path);

    // Set parent
    this._parent.default = parent;
    this._parent.setValue(parent);

    // path
    this._required.default = required;
    this._required.setValue(required);

    return this.form;
  }

  

  //
  _showDynamicFields(dtype) {
    
  }

  
  /**
  * This will check for changed inputs, but some are required for patch call
  * POST - Only required and if changed; UNLESS it is a clone, then pass all values
  * PATCH - Only required and if changed
  * 
  * @returns {formData} as JSON object
  */
  _getLeafFormData() {
    const formData = {};

    // Name: Always sent
    formData.name = this._name.getValue();

    // Path: Should never change or be sent
    // if ((this._path.changed() || this.isClone) && this._path.getValue() !== null) {
    //   formData.path = this._path.getValue();
    // }

    // Parent: Only when changed, or when it is a Clone pass the value along
    // Don't send if the value is null => invalid
    if ((this._parent.changed() || this.isClone) && this._parent.getValue() !== null) {
      formData.parent = this._parent.getValue();
    }

    // console.log(formData);
    return [formData];
  }

  _leafFormData({ form = this.form, id = -1, entityType = null } = {}) {
    const data = {};
    const global = this.isGlobal() ? "true" : "false";
    const formData = this._getLeafFormData(form);

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
      "old_leaf_type_name": this.dataset.oldName,
      "new_leaf_type": {}
    };

    promiseInfo.newName = this._name.getValue();
    promiseInfo.oldName = this.dataset.oldName;

    // console.log("formData");
    // console.log(formData);

    // Hand of the data, and call this form unchanged
    formData.new_leaf_type = this._getLeafFormData(form);
    this.form.classList.remove("changed");
    this.changeReset();

    promiseInfo.promise = await this._fetchLeafPatchPromise(id, formData);

    return promiseInfo;
  }

  _getParentSelect(leaves) {
    const choices = leaves.map(leaf => {
      return {
        value: leaf.id,
        label: leaf.name
      }
    });

    const selector = document.createElement("enum-input");
    selector.setAttribute("name", "Parent");
    selector.choices = choices;

    return selector;
  }

}

customElements.define("leaf-form", LeafForm);
