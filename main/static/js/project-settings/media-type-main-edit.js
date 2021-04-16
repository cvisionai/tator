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
      { "label": "Video", "value": "video" },
      { "label": "Image", "value": "image" },
      { "label": "Multiview", "value": "multi" }
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
    this._form.appendChild(this.dtypeSelect);
    
    // description
    this._editDescription = document.createElement("text-input");
    this._editDescription.setAttribute("name", "Description");
    this._editDescription.setAttribute("type", "string");
    this._editDescription.setValue(this.data.description);
    this._editDescription.default = this.data.description;
    this._editDescription.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editDescription);

    // default volume (video, multi)
    if (data.dtype != 'image') {
      this._defaultVolume = document.createElement("text-input");
      this._defaultVolume.setAttribute("name", "Default volume");
      this._defaultVolume.setAttribute("type", "number");
      this._defaultVolume.setValue(this.data.default_volume);
      this._defaultVolume.default = this.data.default_volume;
      this._defaultVolume.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._defaultVolume);
    }

    // visible
    this._visibleBool = document.createElement("bool-input");
    this._visibleBool.setAttribute("name", "Visible");
    this._visibleBool.setAttribute("on-text", "Yes");
    this._visibleBool.setAttribute("off-text", "No");
    this._visibleBool.setValue(this.data.visible);
    this._visibleBool.default = this.data.visible;
    this._visibleBool.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._visibleBool);

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
