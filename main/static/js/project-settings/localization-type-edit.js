class LocalizationEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "LocalizationType";
    this.readableTypeName = "Localization Type";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="1 1 20 20" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';

  }

  async _getSectionForm(data){
    const current = this.boxHelper.boxWrapDefault( {
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
      { "label": "Select", "value": "" },
      { "label": "Box", "value": "box" },
      { "label": "Line", "value": "line" },
      { "label": "Dot", "value": "dot" }
    ];
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

    // color map
    this._colorMap = document.createElement("color-inputs");
    this._colorMap.setAttribute("name", "Color Map");
    if (this.data.colorMap && this.data.colorMap.default) {
      this._colorMap.setValue(this.data.colorMap.default);
      this._colorMap.default = this.data.colorMap.default;
    } else {
      this._colorMap.setValue(null);
      this._colorMap.default = null;
    }
    this._colorMap.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._colorMap);

    // visible
    this._visibleBool = document.createElement("bool-input");
    this._visibleBool.setAttribute("name", "Visible");
    this._visibleBool.setAttribute("on-text", "Yes");
    this._visibleBool.setAttribute("off-text", "No");
    this._visibleBool.setValue(this.data.visible);
    this._visibleBool.default = this.data.visible;
    this._visibleBool.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._visibleBool);

    // drawable
    this._drawableBool = document.createElement("bool-input");
    this._drawableBool.setAttribute("name", "Drawable");
    this._drawableBool.setAttribute("on-text", "Yes");
    this._drawableBool.setAttribute("off-text", "No");
    this._drawableBool.setValue(this.data.drawable);
    this._drawableBool.default = this.data.visible;
    this._drawableBool.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._drawableBool);


    // line_width
    if (data.dtype != 'image') {
      this._lineWidth = document.createElement("text-input");
      this._lineWidth.setAttribute("name", "Line Width");
      this._lineWidth.setAttribute("type", "number");
      this._lineWidth.setValue(this.data.line_width);
      this._lineWidth.default = this.data.line_width;
      this._lineWidth._input.min = 1;
      this._lineWidth._input.max = 10;
      this._lineWidth.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._lineWidth);
    }

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

    current.appendChild(this._form);

    return current;
  }

  _getFormData(){
    const formData = {};
    
    console.log(`Data ID: ${this.data.id}`);
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
