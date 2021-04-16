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

    // color map
    // this._colorMap = document.createElement("color-input");
    // const COLORMAP = "colorMap";
    // let colMap = data[COLORMAP];
    // let colMapDefault = "";
    // if(typeof colMap !== "undefined" && colMap !== null){
    //   if(typeof colMap.default !== "undefined" && colMap.default !== null) colMapDefault = colMap.default;
    // }
    // this._form.appendChild( this.inputHelper.colorInput({
    //   "labelText": "Color Map Default",
    //   "name": COLORMAP,
    //   "value": colMapDefault,
    //   "type" : "color"
    // } ) );

    // visible
    this._visibleBool = document.createElement("bool-input");
    this._visibleBool.setAttribute("name", "Visible");
    this._visibleBool.setAttribute("on-text", "Yes");
    this._visibleBool.setAttribute("off-text", "No");
    this._visibleBool.setValue(this.data.visible);
    this._visibleBool.default = this.data.visible;
    this._visibleBool.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._visibleBool);

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
    // const mediaList = new DataMediaList( this.projectId );
    // let mediaListWithChecked = mediaList.getCompiledMediaList( data[MEDIA.toLowerCase()]);

    // this._form.appendChild( this.inputHelper.multipleCheckboxes({
    //     "labelText" : MEDIA,
    //     "name": MEDIA.toLowerCase(),
    //     "checkboxList": mediaListWithChecked
    // } ) );

    current.appendChild(this._form);

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

    // line width
    let line_width = Number(form.querySelector('[name="line_width"]').value);

    let mediaInputs =  form.querySelectorAll('input[name^="media"]');
    let media = this.inputHelper._getArrayInputValue(mediaInputs, "checkbox");
    let media_types = media;

    let formData = {
      name,
      description,
      visible,
      grouping_default,
      //media, 
      media_types,
      line_width
    };

    
    // Dtype - only send when it's new
    if(includeDtype) {
      let dtype = form.querySelector('[name="dtype"]').value;
      formData.dtype = dtype;
    }

    // Color map
    let unspecifiedColor = form.querySelector('input[id="unspecifiedColor"]');
    let colorMap = form.querySelector('input[name="colorMap"]').value;

    if(!unspecifiedColor.checked && colorMap !== "" && colorMap !== null) {
      formData.colorMap = { "default" : colorMap} ;
    } else if (unspecifiedColor.value == "na"){
      formData.colorMap = {};
    }

    return formData;
  }
  
}

customElements.define("localization-edit", LocalizationEdit);
