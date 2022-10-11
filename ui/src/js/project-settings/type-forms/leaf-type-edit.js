import { TypeFormTemplate } from "./type-form-template.js";

export class LeafTypeEdit extends TypeFormTemplate {
  constructor() {
    super();
    this.typeName = "LeafType";
    this.readableTypeName = "Leaf Type";
    this._hideAttributes = false;

    // 
    var templateInner = document.getElementById("leaf-type-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("leaf-type-edit--form");
    this._editName = this._shadow.getElementById("leaf-type-edit--name");
    this._editDescription = this._shadow.getElementById("leaf-type-edit--description");
    this.dtypeSelect = this._shadow.getElementById("leaf-type-edit--data-type");
  }

  async _setupFormUnique(data) {

    // dtype  
    const dTypeOptions = [
      { "value": "leaf", "label": "Leaf" }
    ];
    // Emptyform uses "" for dtype value
    this.dtypeSelect.choices = dTypeOptions;
    if (!data.dtype) {
      this.dtypeSelect._select.required = true;
      this.dtypeSelect.default = "";
    } else {
      this.dtypeSelect.setValue(data.dtype);
      this.dtypeSelect.default = data.dtype;
      this.dtypeSelect._select.disabled = true;
    }

    // description
    this._editDescription.setValue(this._data.description);
    this._editDescription.default = this._data.description;

    // visible
    // @TODO won't be in use until we have a leaf tree editor
    // this._visibleBool = document.createElement("bool-input");
    // this._visibleBool.setAttribute("name", "Visible");
    // this._visibleBool.setAttribute("on-text", "Yes");
    // this._visibleBool.setAttribute("off-text", "No");
    // this._visibleBool.setValue(this._data.visible);
    // this._visibleBool.default = this._data.visible;
    // this._visibleBool.addEventListener("change", this._formChanged.bind(this));
    // this._form.appendChild(this._visibleBool);
  }

  _getFormData() {
    const formData = {};

    // console.log(`Data ID: ${this._data.id}`);
    const isNew = this._data.id == "New" ? true : false;

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this.dtypeSelect.changed() || isNew) {
      formData.dtype = this.dtypeSelect.getValue()
    }

    if (this._editDescription.changed() || isNew) {
      formData.description = this._editDescription.getValue();
    }

    // if (this._visibleBool.changed()) {
    //   formData.visible = this._visibleBool.getValue();
    // }

    return formData;
  }

}

customElements.define("leaf-type-edit", LeafTypeEdit);
