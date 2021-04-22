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
    const NAME = "Name";
    this._form.appendChild( this.inputHelper.inputText({ 
      "labelText": NAME, 
      "name": NAME.toLowerCase(), 
      "value": data[NAME.toLowerCase()],
      "required" : true 
    }) );

    // dtype
    const DTYPE = "Dtype";
    const dTypeOptions = [
      { "optText": "State", "optValue": "state" }
    ];
    let disableDtype = data[DTYPE.toLowerCase()] != "" ? true : false;
    let dtypeRequired = !disableDtype ? true : false;
    this._form.appendChild( this.inputHelper.inputSelectOptions( {
      "labelText": "Data Type",
      "name": DTYPE.toLowerCase(),
      "value": data[DTYPE.toLowerCase()],
      "optionsList" : dTypeOptions,
      "disabledInput" : disableDtype,
      "required" : dtypeRequired
    } ) );

    //description
    const DESCRIPTION = "Description";
    this._form.appendChild( this.inputHelper.inputText( { "labelText": DESCRIPTION, "name": DESCRIPTION.toLowerCase(), "value": data[DESCRIPTION.toLowerCase()] } ) );

    // visible
    const VISIBLE = "Visible";
    this._form.appendChild( this.inputHelper.inputRadioSlide({
      "labelText": VISIBLE,
      "name": VISIBLE.toLowerCase(),
      "value": data[VISIBLE.toLowerCase()]
    } ) );

    // grouping default
    const GROUPING = "grouping_default";
    this._form.appendChild( this.inputHelper.inputRadioSlide({
      "labelText": "Grouping Default",
      "name": GROUPING.toLowerCase(),
      "value": data[GROUPING.toLowerCase()]
    } ) );

    // Media
    const MEDIA = "Media";
    const mediaList = new DataMediaList( this.projectId );
    mediaList.getCompiledMediaList( data[MEDIA.toLowerCase()])
    .then(mediaListWithChecked => {
      this._form.appendChild( this.inputHelper.multipleCheckboxes({
          "labelText" : MEDIA,
          "name": MEDIA.toLowerCase(),
          "checkboxList": mediaListWithChecked
      } ) );
    });

    // Associations
    const assocOptions = [
      { "optText": "Media", "optValue": "Media" },
      { "optText": "Frame", "optValue": "Frame" },
      { "optText": "Localization", "optValue": "Localization" }
    ];
    const ASSOC = "association";
    this._form.appendChild( this.inputHelper.inputSelectOptions({
      "labelText": "Association",
      "name": ASSOC,
      "value": data[ASSOC],
      "optionsList" : assocOptions
    } ) );

    // Interpolation
    const interpOptions = [
      { "optText": "None", "optValue": "none" },
      { "optText": "Latest", "optValue": "latest" },
      { "optText": "Attr Style Range", "optValue": "attr_style_range" }
    ];
    const INTERP = "interpolation";
    this._form.appendChild( this.inputHelper.inputSelectOptions({
      "labelText": "Interpolation",
      "name": INTERP,
      "value": data[INTERP],
      "optionsList" : interpOptions
    } ) );

    // Child Localizations
    const CHILDASSOC = "delete_child_localizations";
    this._form.appendChild( this.inputHelper.inputRadioSlide({
      "labelText": "Delete Child Localizations",
      "name": CHILDASSOC,
      "value": data[CHILDASSOC]
    } ) );



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
