class LeafTypeEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "LeafType";
    this.readableTypeName = "Leaf Type";
    this.icon = '<svg class="SideNav-icon" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512"><title></title><path d="M505.664 67.248c-55.376-41.964-140.592-67.017-227.955-67.017-108.060 0-196.113 37.728-241.58 103.51-21.354 30.895-33.165 67.479-35.104 108.737-1.727 36.737 4.442 77.363 18.342 121.073 47.437-142.192 179.91-253.551 332.633-253.551 0 0-142.913 37.616-232.762 154.096-0.056 0.069-1.247 1.545-3.307 4.349-18.040 24.139-33.769 51.581-45.539 82.664-19.935 47.415-38.392 112.474-38.392 190.891h64c0 0-9.715-61.111 7.18-131.395 27.945 3.778 52.929 5.653 75.426 5.653 58.839 0 100.685-12.73 131.694-40.062 27.784-24.489 43.099-57.393 59.312-92.228 24.762-53.204 52.827-113.505 134.327-160.076 4.665-2.666 7.681-7.496 8.028-12.858s-2.020-10.54-6.303-13.786z"></path></svg>';
  }

  _getSectionForm(data){
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

      //
      this._setForm();

      // append input for name
      const NAME = "Name";
      this._form.appendChild( this.inputHelper.inputText( {
        "labelText": NAME,
        "name": NAME.toLowerCase(),
        "value": data[NAME.toLowerCase()],
        "required" : true 
      } ) );

      // dtype
      const DTYPE = "Dtype";      
      const dTypeOptions = [
        { "optText": "Select", "optValue": "" },
        { "optValue" : "leaf", "optText" : "Leaf"}
      ];
      // Emptyform uses "" for dtype value
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
      this._form.appendChild( this.inputHelper.inputText( {
        "labelText": DESCRIPTION,
        "name": DESCRIPTION.toLowerCase(),
        "value": data[DESCRIPTION.toLowerCase()]
      } ) );

      // visible
      const VISIBLE = "Visible";
      this._form.appendChild( this.inputHelper.inputRadioSlide({
        "labelText": VISIBLE,
        "name": VISIBLE.toLowerCase(),
        "value": data[VISIBLE.toLowerCase()]
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

    let formData = {
      name,
      description,
      visible
    };

    // only send dtype when it's new
    if(includeDtype) {
      let dtype = form.querySelector('[name="dtype"]').value;
      formData.dtype = dtype;
    }

    return formData;
  }

}

customElements.define("leaf-type-edit", LeafTypeEdit);
