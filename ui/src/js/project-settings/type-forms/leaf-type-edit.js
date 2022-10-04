import { TypeForm } from "./type-form.js";

export class LeafTypeEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "LeafType";
    this.readableTypeName = "Leaf Type";

    // 
    var templateInner = document.getElementById("leaf-type-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this.typeFormDiv.appendChild(innerClone);

    this._form = this._shadow.getElementById("leaf-type-edit--form");
    this._editName = this._shadow.getElementById("leaf-type-edit--name");
    this._editDescription = this._shadow.getElementById("leaf-type-edit--description");
    this.dtypeSelect = this._shadow.getElementById("leaf-type-edit--data-type");
  }

  async setupForm(data) {
    this.data = data;

    // Setup view
    this._typeId = data.id;
    this._objectName = data.name;
    this._projectId = data.project;

    // name
    let name = ""
    if (data.id !== "New") name = this.data.name
    this._editName.setValue(name);
    this._editName.default = name;


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
    this._editDescription.setValue(this.data.description);
    this._editDescription.default = this.data.description;

    // visible
    // @TODO won't be in use until we have a leaf tree editor
    // this._visibleBool = document.createElement("bool-input");
    // this._visibleBool.setAttribute("name", "Visible");
    // this._visibleBool.setAttribute("on-text", "Yes");
    // this._visibleBool.setAttribute("off-text", "No");
    // this._visibleBool.setValue(this.data.visible);
    // this._visibleBool.default = this.data.visible;
    // this._visibleBool.addEventListener("change", this._formChanged.bind(this));
    // this._form.appendChild(this._visibleBool);
  }

  _getFormData() {
    const formData = {};

    // console.log(`Data ID: ${this.data.id}`);
    const isNew = this.data.id == "New" ? true : false;

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
