class LocalizationEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "LocalizationType";
    this.readableTypeName = "Localization Type";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="1 1 20 20" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';

  }

  _getSectionForm(data){
    const current = this.boxHelper.boxWrapDefault( {
      "children" : ""
    } );

    //
    const _form = document.createElement("form");
    _form.id = data.id;
    current.appendChild( _form );

    _form.addEventListener("change", (event) => {
      this._formChanged(_form, event);
    });

    // append input for name
    const NAME = "Name";
    _form.appendChild( this.inputHelper.inputText({ "labelText": NAME, "name": NAME.toLowerCase(), "value": data[NAME.toLowerCase()]}) );

    //description
    const DESCRIPTION = "Description";
    _form.appendChild( this.inputHelper.inputText( { "labelText": DESCRIPTION, "name": DESCRIPTION.toLowerCase(), "value": data[DESCRIPTION.toLowerCase()] } ) );

    // dtype
    const DTYPE = "Dtype";
    const dTypeOptions = [
      { "optText": "Select", "optValue": "" },
      { "optText": "Box", "optValue": "box" },
      { "optText": "Line", "optValue": "line" },
      { "optText": "Dot", "optValue": "dot" }
    ]
    let disableDtype = data[DTYPE.toLowerCase()] != "" ? true : false;
    _form.appendChild( this.inputHelper.inputSelectOptions({
      "labelText": "Data Type",
      "name": DTYPE.toLowerCase(),
      "value": data[DTYPE.toLowerCase()],
      "optionsList" : dTypeOptions,
      "disabledInput" : disableDtype
    }) );

    // visible
    const VISIBLE = "Visible";
    _form.appendChild( this.inputHelper.inputRadioSlide({
      "labelText": VISIBLE,
      "name": VISIBLE.toLowerCase(),
      "value": data[VISIBLE.toLowerCase()]
    } ) );

    // grouping default
    const GROUPING = "grouping_default";
    _form.appendChild( this.inputHelper.inputRadioSlide({
      "labelText": "Grouping Default",
      "name": GROUPING.toLowerCase(),
      "value": data[GROUPING.toLowerCase()]
    } ) );

    const MEDIA = "Media";
    const mediaData = localStorage.getItem(`MediaData_${this.projectId}`); 
    const mediaList = new DataMediaList( JSON.parse(mediaData) );
    let mediaListWithChecked = mediaList.getCompiledMediaList( data[MEDIA.toLowerCase()]);

    _form.appendChild( this.inputHelper.multipleCheckboxes({
        "labelText" : MEDIA,
        "name": MEDIA.toLowerCase(),
        "checkboxList": mediaListWithChecked
    } ) );

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

    let mediaInputs =  form.querySelectorAll('input[name="media"]');
    let media = this.inputHelper._getArrayInputValue(mediaInputs, "checkbox");

    let formData = {
      name,
      description,
      visible,
      grouping_default,
      media
    };

    // only send dtype when it's new
    if(includeDtype) {
      let dtype = form.querySelector('[name="dtype"]').value;
      formData.dtype = dtype;
    }

    return formData;
  }


  
}

customElements.define("localization-edit", LocalizationEdit);
