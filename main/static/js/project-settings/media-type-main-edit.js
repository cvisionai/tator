class MediaTypeMainEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "MediaType";
    this._shadow.appendChild(this.typeFormDiv);
  }

  _init(data){
    console.log(`${this.tagName} init.`);

    this.data = JSON.parse( data );
    if(this.data.length > 0){
      console.log(this.data);

      this.projectId = this.data[0].project;

      for(let i in this.data){
        let itemDiv = this._addMediaSection(this.data[i]);
      }

      console.log("Init complete : Data length "+this.data.length);

      return this.typeFormDiv;
    } else {
      console.log("Init complete : No data.");
    }
  }

  _addMediaSection(itemData){
    let itemDiv = document.createElement("div");
    itemDiv.id = `itemDivId-${this.typeName}-${itemData.id}`; //#itemDivId-${type}-${itemId}
    itemDiv.setAttribute("class", "item-box item-group-"+itemData.id);
    itemDiv.hidden = true;

    // Section h1.
    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h2 pb-3");
    h1.innerHTML = `Media settings.`;
    itemDiv.appendChild(h1);

    itemDiv.appendChild( this._getSectionForm(itemData) );
    itemDiv.appendChild( this._getSubmitDiv( {"id": itemData.id }) );

    return this.typeFormDiv.appendChild(itemDiv);
  }

  _getHeading(){
    let icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 12 16"><path fill-rule="evenodd" d="M6 5h2v2H6V5zm6-.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v11l3-5 2 4 2-2 3 3V5z"/></svg>';

    return `${icon} <span class="item-label">Media Type</span>`
  }



  _getSectionForm(data){
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
        { "optText": "Video", "optValue": "video" },
        { "optText": "Image", "optValue": "image" },
        { "optText": "Multiview", "optValue": "multi" }
      ]
      _form.appendChild( this.inputHelper.inputSelectOptions({
        "labelText": "Data Type",
        "name": DTYPE.toLowerCase(),
        "value": data[DTYPE.toLowerCase()],
        "optionsList" : dTypeOptions,
        "disabledInput" : true
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

      // attribute types
      //if(data.attribute_types.length > 0){
      this.attributeSection = document.createElement("attributes-main");
      this.attributeSection._init(this.typeName, data.id, data.project, data.attribute_types);
      current.appendChild(this.attributeSection);
      //}

      return current;
  }

  _getFormData(id){
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
     

    return formData;
  }

}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
