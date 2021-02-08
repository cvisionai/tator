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

      // Only editable items inside this form
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
        { "optText": "Leaf", "optValue": "leaf" }
      ];
      let disableDtype = data[DTYPE.toLowerCase()] != "" ? true : false;
      _form.appendChild( this.inputHelper.inputSelectOptions( {
        "labelText": "Data Type",
        "name": DTYPE.toLowerCase(),
        "value": data[DTYPE.toLowerCase()],
        "optionsList" : dTypeOptions,
        "disabledInput" : disableDtype
      } ) );

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

      // Media
      const MEDIA = "Media";
      const mediaData = localStorage.getItem(`MediaData_${this.projectId}`); 
      const mediaList = new DataMediaList( JSON.parse(mediaData) );
      let mediaListWithChecked = mediaList.getCompiledMediaList( data[MEDIA.toLowerCase()]);

      _form.appendChild( this.inputHelper.multipleCheckboxes({
          "labelText" : MEDIA,
          "name": MEDIA.toLowerCase(),
          "checkboxList": mediaListWithChecked
      } ) );

      // Child Associations
      const CHILDASSOC = "delete_child_localizations";
      _form.appendChild( this.inputHelper.inputRadioSlide({
        "labelText": "Delete Child Associations",
        "name": CHILDASSOC,
        "value": data[CHILDASSOC]
      } ) );

      return current;
  }

  _getFormData(id){
    let form = this._shadow.getElementById(id);
      // do not send dtype
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
      let media = this.inputHelper._getArrayInputValue(mediaInputs);

      let delete_child_localizationsInputs =  form.querySelectorAll('.radio-slide-wrap input[name="delete_child_localizations"]');
      let delete_child_localizations = this.inputHelper._getSliderSetValue(delete_child_localizationsInputs);

      let formData = {
        name,
        description,
        visible,
        grouping_default,
        media,
        delete_child_localizations
      };

    return formData;
  }

}

customElements.define("state-type-edit", StateTypeEdit);
