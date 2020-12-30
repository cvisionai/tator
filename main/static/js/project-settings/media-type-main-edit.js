class MediaTypeMainEdit extends SettingsSection {
  constructor() {
    super();
    this._shadow.appendChild(this.settingsSectionDiv);

    //this._setAttributeDTypes();


  }

  _init(data){
    console.log(`${this.tagName} init.`);

    this.data = JSON.parse( data );
    console.log(this.data);

    //this.projectId = this._setProjectId();
    for(let i in this.data){
      let itemDiv = document.createElement("div");
      itemDiv.id = `itemDivId-${this.data[i].dtype}-${this.data[i].id}`; //#itemDivId-${type}-${itemId}
      itemDiv.setAttribute("class", "item-box");
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

  _getSectionForm(media){
    let currentMediaType = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

      // Only editable items inside this form
      this._form = document.createElement("form");
      this._form.id = media.id;
      currentMediaType.appendChild( this._form );

      // name
      this._editName = this._setNameInput(media.name);
      this._form.appendChild( this._editName )

      // description
      this._editDescription = this._setDescriptionInput( media.description );
      this._form.appendChild( this._editDescription );

      // default volume (video, multi)
      let showVolume = media.dtype != 'image' ? true : false;
      this._editVolume = this.inputHelper.inputText({ "labelText": "Default Volume", "value": media.default_volume, "type":"number"})
      if (showVolume) currentMediaType.appendChild( this._editVolume );

      // visible
      this._editVisible = this.inputHelper.inputCheckbox( { "labelText": "Visible", "value": media.visible, "type":"checkbox"} );
      currentMediaType.appendChild( this._editVisible );

      // attribute types
      if(media.attribute_types.length > 0){
        let attributes = document.createElement("settings-attributes");
        attributes._init(media.attribute_types);
        currentMediaType.appendChild(attributes);
      }

      return currentMediaType;
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
    return fetch("/rest/MediaType/" + id, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: this._getFormData(id)
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

  _getFormData(id){
    let form = this._shadow.getElementById(id);
    let formData = new FormData(form);
    let obj = {};
    for (var key of formData.keys()) {
  		obj[key] = formData.get(key);
  	}
    console.log(obj);
    return JSON.stringify(obj);
  }

}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
