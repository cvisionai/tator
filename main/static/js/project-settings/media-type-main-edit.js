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
      itemDiv.id = `itemDivId-${this.data[i].dtype}-${this.data[i].id}`; //#itemDivId-${type}-${itemId}
      itemDiv.setAttribute("class", "item-box item-group-"+this.data[i].id);
      itemDiv.hidden = true;

      // Section h1.
      const h1 = document.createElement("h1");
      h1.setAttribute("class", "h2 pb-3");
      //h1.innerHTML = `Set media and attribute details.`;
      h1.innerHTML = this.data[i].name;
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

      // Only editable items inside this form
      this._form = document.createElement("form");
      this._form.id = data.id;
      current.appendChild( this._form );

      // append input for name
      const NAME = "Name";
      this._form.appendChild( this.inputHelper.inputText(
        { "labelText": NAME, "name": NAME.toLowerCase(), "value": data[NAME.toLowerCase()]
      }) );

      //description
      const DESCRIPTION = "Description";
      this._form.appendChild( this.inputHelper.inputText(
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

  _toggleAttributes(e){
    let el = e.target.parentNode.nextSibling;
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  _toggleChevron(e){
    var el = e.target;
    return el.classList.toggle('chevron-trigger-90');
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

  setSideNav(dom){
    return this._sideNavDom = dom;
  }

  _getFormData(form){
    let formData = new FormData(form);
    let obj = {};
    for (var key of formData.keys()) {
      let value = formData.get(key);
      if(key == "minimum" || key == "maximum"){
        // Number from string....
        value = Number(value);
      } else if(key == "choices" || key == "labels"){ //labels too?
        // Array from string.... @TODO this might be fixed in form now
        if(value.indexOf(",") > 0) {
          value = value.split(',');
        } else {
          value = [...value]
        }

      }

      // add to JSON obj
      obj[key] = value;
  	}
    //console.log(obj);
    return obj;
  }

  _getAttributePromises(id){
    let attrForms = this._shadow.querySelectorAll(`.item-group-${id} settings-attributes .attribute-form`);
    let attrPromises = {};
    attrPromises.promises = [];
    attrPromises.attrNames = [];

    console.log(attrForms.length);

    attrForms.forEach((form, i) => {
      let formData = {
        "entity_type": "MediaType",
        "old_attribute_type_name": form.id,
        "new_attribute_type": {}
      };

      let attrName = form.querySelector('input[name="name"]').value;
      console.log("Attribute name? "+attrName);
      attrPromises.attrNames.push(attrName);

      formData.new_attribute_type = this._getFormData(form);

      let currentPatch = fetch("/rest/AttributeType/" + id, {
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
      attrPromises.promises.push(currentPatch);
    });
    return attrPromises;
  }

  _save({id = -1} = {}){
    console.log("Media Type _save method for id: "+id);
    const patchMedia = this._fetchPatchPromise({"id":id});
    const attrPromises = this._getAttributePromises(id);

    const promises = [patchMedia, ...attrPromises.promises];

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
