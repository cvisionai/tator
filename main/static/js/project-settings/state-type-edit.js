class StateTypeEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "StateType";
    this.readableTypeName = "State Type";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>';

  }

  _getSectionForm(data){
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
      this.dtypeSelect.required = true;
      this.dtypeSelect.default = "";
      this.dtypeSelect.addEventListener("change", this._formChanged.bind(this));
    } else {
      this.dtypeSelect.setValue(data.dtype);
      this.dtypeSelect.default = data.dtype;
      this.dtypeSelect.disabled = true;
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

    // Media
    // const MEDIA = "Media";
    // const mediaList = new DataMediaList( this.projectId );
    // let mediaListWithChecked = mediaList.getCompiledMediaList( data[MEDIA.toLowerCase()]);

    // this._form.appendChild( this.inputHelper.multipleCheckboxes({
    //     "labelText" : MEDIA,
    //     "name": MEDIA.toLowerCase(),
    //     "checkboxList": mediaListWithChecked
    // } ) );

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
    this._deleteChildAssoc = document.createElement("bool-input");
    this._deleteChildAssoc.setAttribute("name", "Delete Child Associations");
    this._deleteChildAssoc.setAttribute("on-text", "Yes");
    this._deleteChildAssoc.setAttribute("off-text", "No");
    this._deleteChildAssoc.setValue(this.data.delete_child_localizations);
    this._deleteChildAssoc.default = this.data.delete_child_localizations;
    this._deleteChildAssoc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._deleteChildAssoc);



    current.appendChild( this._form );

    return current;
  }

  _getFormData(id, includeDtype = false){
    let form = this._shadow.getElementById(id);

      // name only if changed || can not be ""
      let name = form.querySelector('[name="name"]').value;

      // description only if changed
      let description = form.querySelector('[name="description"]').value;

      // Visible is a radio slide
      let visibleInputs =  form.querySelectorAll('.radio-slide-wrap input[name="visible"]');
      let visible = this.inputHelper._getSliderSetValue(visibleInputs);

      // grouping_default is a radio slide
      let grouping_defaultInputs =  form.querySelectorAll('.radio-slide-wrap input[name="grouping_default"]');
      let grouping_default = this.inputHelper._getSliderSetValue(grouping_defaultInputs);

      let mediaInputs =  form.querySelectorAll('input[name^="media"]');
      let media = this.inputHelper._getArrayInputValue(mediaInputs, "checkbox");
      let media_types = media;

      let association = form.querySelector('[name="association"]').value;
      
      let interpolation = form.querySelector('[name="interpolation"]').value;

      let delete_child_localizationsInputs =  form.querySelectorAll('.radio-slide-wrap input[name="delete_child_localizations"]');
      let delete_child_localizations = this.inputHelper._getSliderSetValue(delete_child_localizationsInputs);

      let formData = {
        name,
        description,
        visible,
        grouping_default,
        //media,
        media_types,
        delete_child_localizations,
        association,
        interpolation
      };

      // only send dtype when it's new
      if(includeDtype) {
        let dtype = form.querySelector('[name="dtype"]').value;
        formData.dtype = dtype;
      }

    return formData;
  }

}

customElements.define("state-type-edit", StateTypeEdit);
