class MediaTypeMainEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "MediaType";
    this.readableTypeName = "Media Type";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 12 16"><path fill-rule="evenodd" d="M6 5h2v2H6V5zm6-.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v11l3-5 2 4 2-2 3 3V5z"/></svg>';
  }

  _getSectionForm(data){
    console.log("Get section form");
    console.log(data.id);
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

      //
      let _form = document.createElement("form");
      _form.id = data.id;
      current.appendChild( _form );

      _form.addEventListener("change", (event) => {
        this._formChanged(_form, event);
      });

      // append input for name
      const NAME = "Name";
      _form.appendChild( this.inputHelper.inputText( {
        "labelText": NAME,
        "name": NAME.toLowerCase(),
        "value": data[NAME.toLowerCase()]
      }) );

      // dtype
      const DTYPE = "Dtype";
      const dTypeOptions = [
        { "optText": "Select", "optValue": "" },
        { "optText": "Video", "optValue": "video" },
        { "optText": "Image", "optValue": "image" },
        { "optText": "Multiview", "optValue": "multi" }
      ];
      let disableDtype = data[DTYPE.toLowerCase()] != "" ? true : false;
      _form.appendChild( this.inputHelper.inputSelectOptions({
        "labelText": "Data Type",
        "name": DTYPE.toLowerCase(),
        "value": data[DTYPE.toLowerCase()],
        "optionsList" : dTypeOptions,
        "disabledInput" : disableDtype
      }) );

      //description
      const DESCRIPTION = "Description";
      _form.appendChild( this.inputHelper.inputText({
        "labelText": DESCRIPTION,
        "name": DESCRIPTION.toLowerCase(),
        "value": data[DESCRIPTION.toLowerCase()]
      } ) );

      // default volume (video, multi)
      const VOLUME = "default_volume";
      let showVolume = data.dtype != 'image' ? true : false;
      if (showVolume) _form.appendChild( this.inputHelper.inputText( {
        "labelText": "Default Volume",
        "name": VOLUME.toLowerCase(),
        "value": data[VOLUME.toLowerCase()],
        "type":"number"
      } ) );

      // visible
      const VISIBLE = "Visible";
      _form.appendChild( this.inputHelper.inputRadioSlide({
        "labelText": VISIBLE,
        "name": VISIBLE.toLowerCase(),
        "value": data[VISIBLE.toLowerCase()]
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

      let formData = {
        name,
        description,
        visible
      };

      // default only if changed || volume to Number
      if(form.querySelector('[name="default_volume"]')) {
        let default_volume = Number(form.querySelector('[name="default_volume"]').value);
        formData["default_volume"] = default_volume;
      }

      // only send dtype when it's new
      if(includeDtype) {
        let dtype = form.querySelector('[name="dtype"]').value;
        formData.dtype = dtype;
      }

    return formData;
  }


}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
