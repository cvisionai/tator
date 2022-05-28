import { TatorElement } from "../../components/tator-element.js";

export class LeafForm extends TatorElement {
  constructor() {
    super();

    // Flag values
    this._changed = false;
    this._global = false;
    this._fromType = null;
  }

  set fromType(val) {
    this._fromType = val;
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

  _initEmptyForm(leaves, name) {
    const form = document.createElement("form");
    this.form = form;
    this.projectName = name;

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
    this._path.default = "";
    this._path.setAttribute("type", "string");
    this._path.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._path);

    // Choices for Parent
    let choices = [];
    choices.push({ value: null, label: "None" });

    if (typeof leaves == "string" && leaves !== "") {
      leaves = [leaves];
    } else if (Array.isArray(leaves)){
      choices = [...choices, ...leaves.map(leaf => {
        return {
          value: leaf.id,
          label: leaf.name
        }
      })];
    }

    this._parentLeaf = document.createElement("enum-input");
    this._parentLeaf.setAttribute("name", "Parent");
    this._parentLeaf.choices = choices;
    this.form.appendChild(this._parentLeaf);

    console.log(this._parentLeaf);
    
    this._shadow.appendChild(this.form);

    return this.form;
  }

  _formChanged() {
    console.log("Leaf form changed");
    this.changed = true;
    return this.form.classList.add("changed");
  }

  _getFormWithValues(leaves) {
    const {
      clone = false,
      name = null,
      path = null,
      parent = null,
      projectName = ""
    } = leaves;

    // do we want to save all the data shown
    this.isClone = clone;

    // gets leaf object as param destructured over these values
    //sets value on THIS form
    this.form = this._initEmptyForm(leaves, projectName);

    console.log(this.form);

    /* fields that are always available */
    // Set Name
    this._name.default = name;
    this._name.setValue(name);

    // Set path
    this._path.default = path;
    this._path.setValue(path);

    console.log(this._path);

    // Set parent
    console.log("// Set parent " + parent);
    console.log(this._parentLeaf);
    this._parentLeaf.default = parent;
    this._parentLeaf.setValue(parent);

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
    if ((this._parentLeaf.changed() || this.isClone) && this._parentLeaf.getValue() !== null) {
      formData.parent = Number(this._parentLeaf.getValue());
    }

    // Always send the type
    formData.type = this._fromType;

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

}

customElements.define("leaf-form", LeafForm);
