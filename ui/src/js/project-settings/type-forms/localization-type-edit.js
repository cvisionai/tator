import { TypeForm } from "./type-form.js";
import { getCompiledList } from "../store.js";

export class LocalizationEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "LocalizationType";
    this.readableTypeName = "Localization Type";

    // 
    var templateInner = document.getElementById("localization-type-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this.typeFormDiv.appendChild(innerClone);

    this._form = this._shadow.getElementById("localization-type-edit--form");
    this._editName = this._shadow.getElementById("localization-type-edit--name");
    this.dtypeSelect = this._shadow.getElementById("localization-type-edit--data-type");  
    this._editDescription = this._shadow.getElementById("localization-type-edit--description");
    this._colorMap = this._shadow.getElementById("localization-type-edit--color-map");
    this._visibleBool = this._shadow.getElementById("localization-type-edit--visible");
    this._drawableBool = this._shadow.getElementById("localization-type-edit--drawable");
    
    this._lineWidth = this._shadow.getElementById("localization-type-edit--line-width");
    this._lineWidth._input.min = 1;
    this._lineWidth._input.max = 10;

    this._groupingDefault = this._shadow.getElementById("localization-type-edit--grouping-default");
    this._mediaCheckboxes = this._shadow.getElementById("localization-type-edit--media");
  }

  async setupForm(data) {
    this.data = data;

    // Setup view
    this._typeId = data.id;
    this._objectName = data.name;
    this._projectId = data.project;

    // name
    let  name  = ""
    if (data.id !== "New") name = this.data.name
    
    // append input for name
    this._editName.setValue(name);
    this._editName.default = name;

    // dtype
    const dTypeOptions = [
      { "label": "Select", "value": "" },
      { "label": "Box", "value": "box" },
      { "label": "Line", "value": "line" },
      { "label": "Dot", "value": "dot" },
      { "label": "Poly", "value": "poly" }
    ];
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

    // color map
    if (this.data.colorMap && this.data.colorMap.default) {
      this._colorMap.setValue(this.data.colorMap.default);
      this._colorMap.default = this.data.colorMap.default;
    } else {
      this._colorMap.setValue(null);
      this._colorMap.default = null;
    }

    // visible
    this._visibleBool.setValue(this.data.visible);
    this._visibleBool.default = this.data.visible;

    // drawable
    this._drawableBool.setValue(this.data.drawable);
    this._drawableBool.default = this.data.drawable;

    // line_width
    this._lineWidth.setValue(this.data.line_width);
    this._lineWidth.default = this.data.line_width;


    // grouping default
    this._groupingDefault.setValue(this.data.grouping_default);
    this._groupingDefault.default = this.data.grouping_default;

    // const MEDIA = "Media"; 
    if (typeof data.media !== "undefined") {
      try {
        const mediaListWithChecked = getCompiledList({ type: this.typeName, skip: data.id, check: this.data.media});
        this._mediaCheckboxes.setValue( mediaListWithChecked );
        this._mediaCheckboxes.default = mediaListWithChecked;
      } catch (err) {
        console.error("Error populating media list.", err);
      }
    }
  }

  _getFormData(){
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

    if (this._colorMap.changed() || isNew) {
      formData.colorMap = {};
      const colorMapDefaultVal = this._colorMap.getValue();
      if (this._colorMap.getValue() !== null) {
        formData.colorMap.default = colorMapDefaultVal;
      }
    }

    if (this._visibleBool.changed() || isNew) {
      formData.visible = this._visibleBool.getValue();
    }

    if (this._drawableBool.changed() || isNew) {
      formData.drawable = this._drawableBool.getValue();
    }

    if (this._lineWidth.changed() || isNew) {
      formData.line_width = Number(this._lineWidth.getValue());
    }

    if (this._groupingDefault.changed() || isNew) {
      formData.grouping_default = this._groupingDefault.getValue();
    }

    if (this._mediaCheckboxes.changed() || isNew) {
      formData.media_types = this._mediaCheckboxes.getValue();
    }

    return formData;
  }
  
}

customElements.define("localization-edit", LocalizationEdit);
