class MediaTypeMainEdit extends SettingsSection {
  constructor() {
    super();
    this._shadow.appendChild(this.settingsSectionDiv);
  }

  _init(data){
    console.log(`${this.tagName} init.`);

    this.data = JSON.parse( data );
    console.log(this.data);

    for(let i in this.data){
      let itemDiv = document.createElement("div");
      itemDiv.id = `itemDivId-media-${this.data[i].id}`; //#itemDivId-${type}-${itemId}
      itemDiv.setAttribute("class", "item-box item-group-"+this.data[i].id);
      itemDiv.hidden = true;

      // Section h1.
      const h1 = document.createElement("h1");
      h1.setAttribute("class", "h2 pb-3");
      //h1.innerHTML = `Set media and attribute details.`;
      //h1.innerHTML = this.data[i].name;
      h1.innerHTML = `Media settings.`;
      itemDiv.appendChild(h1);

      itemDiv.appendChild( this._getSectionForm(this.data[i]) );
      itemDiv.appendChild( this._getSubmitDiv( {"id": this.data[i].id }) );

      this.settingsSectionDiv.appendChild(itemDiv);
    }

    return this.settingsSectionDiv;
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
        this._formChanged(_form);
      });

      // append input for name
      const NAME = "Name";
      _form.appendChild( this.inputHelper.inputText(
        { "labelText": NAME, "name": NAME.toLowerCase(), "value": data[NAME.toLowerCase()]
      }) );

      // append input for dtype
      const DTYPE = "Dtype";
      const dTypeOptions = [
        { "optText": "Video", "optValue": "video" },
        { "optText": "Image", "optValue": "line" },
        { "optText": "Multiview", "optValue": "multi" }
      ]
      current.appendChild( this.inputHelper.inputSelectOptions({
        "labelText": DTYPE,
        "name": DTYPE.toLowerCase(),
        "value": data[DTYPE.toLowerCase()],
        "optionsList" : dTypeOptions,
        "disabledInput" : true
      }) );

      //description
      const DESCRIPTION = "Description";
      _form.appendChild( this.inputHelper.inputText(
        { "labelText": DESCRIPTION, "name": DESCRIPTION.toLowerCase(), "value": data[DESCRIPTION.toLowerCase()] }
       ) );

      // default volume (video, multi)
      const VOLUME = "Volume";
      let showVolume = data.dtype != 'image' ? true : false;
      if (showVolume) current.appendChild( this.inputHelper.inputText(
        { "labelText": VOLUME, "name": VOLUME.toLowerCase(), "value": data[VOLUME.toLowerCase()], "type":"number"}
      ) );

      // visible
      const VISIBLE = "Visible";
      current.appendChild( this.inputHelper.inputCheckbox(
        { "labelText": VISIBLE, "name": VISIBLE.toLowerCase(), "value": data[VISIBLE.toLowerCase()] }
      ) );

      // attribute types
      if(data.attribute_types.length > 0){
        this.attributeSection = document.createElement("settings-attributes");
        this.attributeSection._init("MEDIA", data.attribute_types);
        current.appendChild(this.attributeSection);
      }

      return current;
  }

  _fetchGetPromise({id = this.projectId} = {}){
    return fetch("/rest/MediaTypes/" + id, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  _fetchPatchPromise({id = -1 } = {}){
    console.log("Patch id: "+id);
    let mediaForm = this._shadow.getElementById(id);
    let formData = this._getFormData(mediaForm);

    console.log(mediaForm);

    return fetch("/rest/MediaType/" + id, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    })
  }

  reset(scope){
    console.log("Not setup yet [Reset with project data.]");
    //location.reload();
    return false;
  }

  resetHard(){
    this._fetchNewProjectData();
    //this.reset();
  }

_fetchNewProjectData(){
  //this._sideNavDom.querySelector(`a[href="#mediaId-65"]`);
}

_getAllChangedAsPromiseArray({id = -1} = {}){
  const patchMedia = this._fetchPatchPromise({"id":id});
  const attrPromises = this._getAttributePromises({
    "id" : id,
    "entityType" : "MediaType"
  });

  const promises = [patchMedia, ...attrPromises.promises];
}



  _save({id = -1} = {}){
    console.log("Media Type _save method for id: "+id);

    const promises = _getAllChangedAsPromiseArray({"id":id});

    // Check if anything changed
    Promise.all(promises).then( async( respArray ) => {
      console.log(respArray);
      let responses = [];
      respArray.forEach((item, i) => {
        responses.push( item.json() )
      });

        Promise.all( responses )
          .then ( dataArray => {
            let message = "";
            respArray.forEach((item, i) => {
              console.log("Media Type save response....");
              let bumpIndexForAttr = true;
              let formReadable = "Media Type";
              if (i == 0 && item.url.indexOf("Attribute") > 0) {
                bumpIndexForAttr = false
              }
              if( attrPromises.attrNames.length > 0 && item.url.indexOf("Attribute") > 0){
                let index = bumpIndexForAttr ? i-1 : i;
                let attrNamed = attrPromises.attrNames[index];
                console.log("Attribute Response"+attrNamed);
                formReadable = `Attribute "${attrNamed}"`
              }
              console.log(item.status);
              console.log("Save response message: "+dataArray[i].message);
              if(item.status == 200 & dataArray[i].message != ""){
                message += dataArray[i].message+"<br/>";
              } else if (item.status !== 200 ){
                message += "Information for "+formReadable+" did not save."+"<br/>";
              }
            });
          //  if (response.status == "200") {
              this._modalSuccess(message);
          //    this._fetchNewProjectData();
          //  } else {
          //    this._modalError(message);
          //  }
        });
    });
  }

}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
