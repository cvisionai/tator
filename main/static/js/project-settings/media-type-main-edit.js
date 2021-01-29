class MediaTypeMainEdit extends SettingsSection {
  constructor() {
    super();
    this.fromType = "MediaType";
    this._shadow.appendChild(this.settingsSectionDiv);
  }

  _init(data){
    console.log(`${this.tagName} init.`);

    this.data = JSON.parse( data );
    if(this.data.length > 0){
      console.log(this.data);

      const mediaList = [];

      for(let i in this.data){
        let itemDiv = document.createElement("div");
        itemDiv.id = `itemDivId-media-${this.data[i].id}`; //#itemDivId-${type}-${itemId}
        itemDiv.setAttribute("class", "item-box item-group-"+this.data[i].id);
        itemDiv.hidden = true;

        // create reference list for later
        mediaList.push({
          "id" : this.data[i].id,
          "name" : this.data[i].name
        });

        // Section h1.
        const h1 = document.createElement("h1");
        h1.setAttribute("class", "h2 pb-3");
        h1.innerHTML = `Media settings.`;
        itemDiv.appendChild(h1);

        itemDiv.appendChild( this._getSectionForm(this.data[i]) );
        itemDiv.appendChild( this._getSubmitDiv( {"id": this.data[i].id }) );

        this.settingsSectionDiv.appendChild(itemDiv);
      }


      this._storeMediaTypesList(this.data[0].project, mediaList);

      console.log("Init complete : Data length "+this.data.length);

      return this.settingsSectionDiv;
    } else {
      console.log("Init complete : No data.");
    }
  }

  _storeMediaTypesList(projectId, mediaList){
    let key = 'MediaTypes_Project_'+projectId
    let value = JSON.stringify(mediaList)

    localStorage.setItem(key, value);
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
      this.attributeSection = document.createElement("settings-attributes");
      this.attributeSection._init(this.fromType, data.id, data.project, data.attribute_types);
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

      // default only if changed || volume to Number
      let default_volume = Number(form.querySelector('[name="default_volume"]').value);

      // Visible is a radio slide
      let visibleInputs =  form.querySelectorAll('.radio-slide-wrap input[name="visible"]');
      let visible = this.inputHelper._getSliderSetValue(visibleInputs);

      let formData = {
        name,
        description,
        default_volume,
        visible
      };

    return formData;
  }

  reset(scope){
    console.log("Not setup yet [Reset with project data.]");
    return false;
  }

  resetHard(){
    this._fetchNewProjectData();
    this.reset();
  }

  _fetchNewProjectData(){
    //
  }

}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
