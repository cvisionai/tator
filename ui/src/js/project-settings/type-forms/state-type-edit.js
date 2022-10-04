import { TypeForm } from "./type-form.js";

export class StateTypeEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "StateType";
    this.readableTypeName = "State Type";
    
    // 
    var templateInner = document.getElementById("state-type-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this.typeFormDiv.appendChild(innerClone);

    this._form = this._shadow.getElementById("state-type-edit--form");
    this._editName = this._shadow.getElementById("state-type-edit--name");
    this._editDescription = this._shadow.getElementById("state-type-edit--description");
    this.dtypeSelect = this._shadow.getElementById("state-type-edit--data-type");
    this._visibleBool = this._shadow.getElementById("state-type-edit--visible");
    this._groupingDefault = this._shadow.getElementById("state-type-edit--grouping-default");
    this._mediaCheckboxes = this._shadow.getElementById("state-type-edit--media");
    this._association = this._shadow.getElementById("state-type-edit--association");
    this._interpolation = this._shadow.getElementById("state-type-edit--interpolation");
    this._deleteChildLoc = this._shadow.getElementById("state-type-edit--delete-child");
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
      { "label": "State", "value": "state" }
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
    this._visibleBool.setValue(this.data.visible);
    this._visibleBool.default = this.data.visible;

    // grouping default
    this._groupingDefault.setValue(this.data.grouping_default);
    this._groupingDefault.default = this.data.grouping_default;

    // const MEDIA = "Media"; 
    if (typeof data.media !== "undefined") {
      try {
        const mediaListWithChecked = await getCompiledList({
          type: this.typeName,
          skip: data.id,
          check: this.data.media
        });
        this._mediaCheckboxes.setValue( mediaListWithChecked );
        this._mediaCheckboxes.default = mediaListWithChecked; 
      } catch (err) {
        console.error("Error populating media list.", err);
      }
    }

    // Associations
    const assocOptions = [
      { "label" : "Select", "value" : ""},
      { "value": "Media"},
      { "value": "Frame" },
      { "value": "Localization" }
    ];
    this._association.choices = assocOptions;
    if (!data.association) {
      this._association.default = ""; 
    } else {
      this._association.setValue(data.association);
      this._association.default = data.association;
    }

    // Interpolation
    const interpOptions = [
      { "label" : "Select", "value" : ""},
      { "label": "None", "value": "none" },
      { "label": "Latest", "value": "latest" },
      { "label": "Attr Style Range", "value": "attr_style_range" }
    ];
    this._interpolation.choices = interpOptions;
    if (!data.interpolation) {
      this._interpolation.default = ""; 
    } else {
      this._interpolation.setValue(data.interpolation);
      this._interpolation.default = data.interpolation;
    }

    // Child Localizations
    this._deleteChildLoc.setValue(this.data.delete_child_localizations);
    this._deleteChildLoc.default = this.data.delete_child_localizations;

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

    if (this._visibleBool.changed() || isNew) {
      formData.visible = this._visibleBool.getValue();
    }

    if (this._groupingDefault.changed() || isNew) {
      formData.grouping_default = this._groupingDefault.getValue();
    }

    if (this._mediaCheckboxes.changed() || isNew) {
      formData.media_types = this._mediaCheckboxes.getValue();
    }

    if (this._association.changed() || isNew) {
      formData.association = this._association.getValue();
    }

    if (this._interpolation.changed() || isNew) {
      formData.interpolation = this._interpolation.getValue();
    }

    if (this._deleteChildLoc.changed() || isNew) {
      formData.delete_child_localizations = this._deleteChildLoc.getValue();
    }

    return formData;
  }

}

customElements.define("state-type-edit", StateTypeEdit);
