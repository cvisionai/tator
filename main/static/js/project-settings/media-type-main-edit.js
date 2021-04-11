class MediaTypeMainEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "MediaType";
    this.readableTypeName = "Media Type";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="18" viewBox="0 0 12 16"><path fill-rule="evenodd" d="M6 5h2v2H6V5zm6-.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v11l3-5 2 4 2-2 3 3V5z"/></svg>';
  }

  _getSectionForm(data){
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

    //
    this._setForm();

    // append input for name
    const NAME = "Name";
    this._editName = this.inputHelper.inputText( {
      "labelText": NAME,
      "name": NAME.toLowerCase(),
      "value": data[NAME.toLowerCase()],
      "required" : true 
    });
    this._form.appendChild( this._editName );

    // dtype
    const DTYPE = "Dtype";
    const dTypeOptions = [
      { "optText": "Select", "optValue": "" },
      { "optText": "Video", "optValue": "video" },
      { "optText": "Image", "optValue": "image" },
      { "optText": "Multiview", "optValue": "multi" }
    ];
    // Emptyform uses "" for dtype value
    let disableDtype = data[DTYPE.toLowerCase()] != "" ? true : false;
    let dtypeRequired = !disableDtype ? true : false;
    this.dtypeSelect = this.inputHelper.inputSelectOptions({
      "labelText": "Data Type",
      "name": DTYPE.toLowerCase(),
      "value": data[DTYPE.toLowerCase()],
      "optionsList" : dTypeOptions,
      "disabledInput" : disableDtype,
      "required" : dtypeRequired
    });
    this._form.appendChild( this.dtypeSelect );

    //description
    const DESCRIPTION = "Description";
    this._form.appendChild( this.inputHelper.inputText({
      "labelText": DESCRIPTION,
      "name": DESCRIPTION.toLowerCase(),
      "value": data[DESCRIPTION.toLowerCase()]
    } ) );

    // default volume (video, multi)
    const VOLUME = "default_volume";
    let showVolume = data.dtype != 'image' ? true : false;
    if (showVolume) this._form.appendChild( this.inputHelper.inputText( {
      "labelText": "Default Volume",
      "name": VOLUME.toLowerCase(),
      "value": data[VOLUME.toLowerCase()],
      "type":"number",
      "max" : 100,
      "min" : 0
    } ) );

    // visible
    const VISIBLE = "Visible";
    this._form.appendChild( this.inputHelper.inputRadioSlide({
      "labelText": VISIBLE,
      "name": VISIBLE.toLowerCase(),
      "value": data[VISIBLE.toLowerCase()]
    } ) );

    current.appendChild(this._form)

    return current;
  }

  _getFormData(id, includeDtype = false){
      let form = this._shadow.getElementById(id);
      let hasErrors = "";

      // description 
      let description = form.querySelector('[name="description"]').value;

      // Visible is a radio slide
      let visibleInputs =  form.querySelectorAll('.radio-slide-wrap input[name="visible"]');
      let visible = this.inputHelper._getSliderSetValue(visibleInputs);

      let formData = {
        description,
        visible
      };

      // default volume to Number
      if(form.querySelector('[name="default_volume"]')) {
        //maximum of 100
        let default_volume = Number(form.querySelector('[name="default_volume"]').value);
        formData["default_volume"] = default_volume;
      }

      // can not be ""
      if(this._nameChanged()){
        let nameInput = form.querySelector('[name="name"]');
        let name = nameInput.value;
        //if(name !== "" || name !== null) {
          formData["name"] = name;
          //
          nameInput.classList.remove("has-border");
          nameInput.classList.remove("is-invalid");
        // } else {
        //   nameInput.classList.add("has-border");
        //   nameInput.classList.add("is-invalid");
        //   hasErrors += "Name cannot be blank\n";
        // } 
        if(!includeDtype) {
          this._updateNavEvent("rename", name);
        }   
      }
    
      // only send dtype when it's new, if included cannot be ""
      if(includeDtype) {
        let dtypeSelect = form.querySelector('[name="dtype"]');
        let dtype = dtypeSelect.value;
        //if(dtype !== "" || dtype !== null) {
          formData.dtype = dtype;
        // } else {
        //   this._input.classList.add("has-border");
        //   this._input.classList.add("is-invalid");
        //   hasErrors += "Data Type cannot be blank\n";
        // }
      }

    //if(hasErrors != "") return `Form error: ${hasErrors}`
    return formData;
  }


}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
