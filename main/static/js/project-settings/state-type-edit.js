class StateTypeEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "StateType";
    this.readableTypeName = "State Type";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>';

  }

  async _getSectionForm(data){
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

    //
    this._setForm();

    // append input for name
    this._editName = document.createElement("text-input");
    this._editName.setAttribute("name", "Name");
    this._editName.setAttribute("type", "string");
    this._editName.setValue(this.data.name);
    this._editName.default = this.data.name;
    this._editName.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editName);

    // dtype
    const dTypeOptions = [
      { "label": "State", "value": "state" }
    ];
    // Emptyform uses "" for dtype value
    this.dtypeSelect = document.createElement("enum-input");
    this.dtypeSelect.setAttribute("name", "Data Type");
    this.dtypeSelect.choices = dTypeOptions;
    if (!data.dtype) {
      this.dtypeSelect._select.required = true;
      this.dtypeSelect.default = "";
      this.dtypeSelect.addEventListener("change", this._formChanged.bind(this));
    } else {
      this.dtypeSelect.setValue(data.dtype);
      this.dtypeSelect.default = data.dtype;
      this.dtypeSelect._select.disabled = true;
    }
    this._form.appendChild( this.dtypeSelect );

    // description
    this._editDescription = document.createElement("text-input");
    this._editDescription.setAttribute("name", "Description");
    this._editDescription.setAttribute("type", "string");
    this._editDescription.setValue(this.data.description);
    this._editDescription.default = this.data.description;
    this._editDescription.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editDescription);

    // visible
    this._visibleBool = document.createElement("bool-input");
    this._visibleBool.setAttribute("name", "Visible");
    this._visibleBool.setAttribute("on-text", "Yes");
    this._visibleBool.setAttribute("off-text", "No");
    this._visibleBool.setValue(this.data.visible);
    this._visibleBool.default = this.data.visible;
    this._visibleBool.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._visibleBool);

    // grouping default
    this._groupingDefault = document.createElement("bool-input");
    this._groupingDefault.setAttribute("name", "Grouping Default");
    this._groupingDefault.setAttribute("on-text", "Yes");
    this._groupingDefault.setAttribute("off-text", "No");
    this._groupingDefault.setValue(this.data.grouping_default);
    this._groupingDefault.default = this.data.grouping_default;
    this._groupingDefault.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._groupingDefault);

    // const MEDIA = "Media"; 
    const mediaList = new DataMediaList( this.projectId );
    const mediaListWithChecked = await mediaList.getCompiledMediaList( data.media );
    this._mediaCheckboxes = document.createElement("checkbox-set");
    this._mediaCheckboxes.setAttribute("name", "Media");
    this._mediaCheckboxes.setAttribute("type", "number");
    this._mediaCheckboxes.setValue( mediaListWithChecked );
    this._mediaCheckboxes.default = mediaListWithChecked;
    this._mediaCheckboxes.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._mediaCheckboxes);

    // Associations
    const assocOptions = [
      { "label" : "Select", "value" : ""},
      { "value": "Media"},
      { "value": "Frame" },
      { "value": "Localization" }
    ];
    this._association = document.createElement("enum-input");
    this._association.setAttribute("name", "Association");
    this._association.choices = assocOptions;
    if (!data.association) {
      this._association.default = ""; 
    } else {
      this._association.setValue(data.association);
      this._association.default = data.association;
    }
    this._association.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild( this._association );

    // Interpolation
    const interpOptions = [
      { "label" : "Select", "value" : ""},
      { "label": "None", "value": "none" },
      { "label": "Latest", "value": "latest" },
      { "label": "Attr Style Range", "value": "attr_style_range" }
    ];
    this._interpolation = document.createElement("enum-input");
    this._interpolation.setAttribute("name", "Interpolation");
    this._interpolation.choices = interpOptions;
    if (!data.interpolation) {
      this._interpolation.default = ""; 
    } else {
      this._interpolation.setValue(data.interpolation);
      this._interpolation.default = data.interpolation;
    }
    this._interpolation.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild( this._interpolation );

    // Child Localizations
    this._deleteChildLoc = document.createElement("bool-input");
    this._deleteChildLoc.setAttribute("name", "Delete Child Localizations");
    this._deleteChildLoc.setAttribute("on-text", "Yes");
    this._deleteChildLoc.setAttribute("off-text", "No");
    this._deleteChildLoc.setValue(this.data.delete_child_localizations);
    this._deleteChildLoc.default = this.data.delete_child_localizations;
    this._deleteChildLoc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._deleteChildLoc);

    current.appendChild( this._form );

    return current;
  }

  _getFormData(){
    const formData = {};

    if (this._editName.changed() && this._editName.getValue()) {
      formData.name = this._editName.getValue();
    }

    if (this.dtypeSelect.changed() || this.dtypeSelect.getValue()) {
      formData.dtype = this.dtypeSelect.getValue()
    }

    if (this._editDescription.changed() && this._editDescription.getValue()) {
      formData.description = this._editDescription.getValue();
    }

    if (this._visibleBool.changed() && this._visibleBool.getValue()!== null) {
      formData.visible = this._visibleBool.getValue();
    }

    if (this._groupingDefault.changed() && this._groupingDefault.getValue()!== null) {
      formData.grouping_default = this._groupingDefault.getValue();
    }

    if (this._mediaCheckboxes.changed() && this._mediaCheckboxes.getValue()) {
      formData.media_types = this._mediaCheckboxes.getValue();
    }

    if (this._association.changed() && this._association.getValue()) {
      formData.association = this._association.getValue();
    }

    if (this._interpolation.changed() && this._interpolation.getValue()) {
      formData.interpolation = this._interpolation.getValue();
    }

    if (this._deleteChildLoc.changed() && this._deleteChildLoc.getValue() !== null) {
      formData.delete_child_localizations = this._deleteChildLoc.getValue();
    }

    return formData;
  }

}

customElements.define("state-type-edit", StateTypeEdit);
