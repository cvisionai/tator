class LocalizationEdit extends SettingsSection {
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
      itemDiv.id = `itemDivId-localization-${this.data[i].id}`; //#itemDivId-${type}-${itemId}
      itemDiv.setAttribute("class", "item-box item-group-"+this.data[i].id);
      itemDiv.hidden = true;

      // Section h1.
      const h1 = document.createElement("h1");
      h1.setAttribute("class", "h2 pb-3");
      //h1.innerHTML = `Set media and attribute details.`;
      h1.innerHTML = this.data[i].name;
      itemDiv.appendChild(h1);

      itemDiv.appendChild( this._getSectionForm( this.data[i]) );
      itemDiv.appendChild( this._getSubmitDiv( {"id": this.data[i].id }) );

      this.settingsSectionDiv.appendChild(itemDiv);
    }

    return this.settingsSectionDiv;
  }

  _getSectionForm(data){
    const current = this.boxHelper.boxWrapDefault( {
      "children" : ""
    } );

    //
    const _form = document.createElement("form");
    _form.id = data.id;
    current.appendChild( _form );

    _form.addEventListener("change", (event) => {
      this._formChanged(_form);
    });

    // append input for name
    const NAME = "Name";
    _form.appendChild( this.inputHelper.inputText({ "labelText": NAME, "name": NAME.toLowerCase(), "value": data[NAME.toLowerCase()]}) );

    //description
    const DESCRIPTION = "Description";
    _form.appendChild( this.inputHelper.inputText( { "labelText": DESCRIPTION, "name": DESCRIPTION.toLowerCase(), "value": data[DESCRIPTION.toLowerCase()] } ) );

    // append input for dtype
    const DTYPE = "Dtype";
    const dTypeOptions = [
      { "optText": "Box", "optValue": "box" },
      { "optText": "Line", "optValue": "line" },
      { "optText": "Dot", "optValue": "dot" }
    ]
    current.appendChild( this.inputHelper.inputSelectOptions({
      "labelText": DTYPE,
      "name": DTYPE.toLowerCase(),
      "value": data[DTYPE.toLowerCase()],
      "optionsList" : dTypeOptions,
      "disabledInput" : true
    }) );

    // attribute types
    if(data.attribute_types.length > 0){
      this.attributeSection = document.createElement("settings-attributes");
      this.attributeSection._init("LOCALIZATION", data.attribute_types);
      current.appendChild(this.attributeSection);
    }

    return current;
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

  _fetchGetPromise({id = this.projectId} = {}){
    return fetch("/rest/LocalizationTypes/" + id, {
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
    let form = this._shadow.getElementById(id);
    let formData = this._getFormData(form);

    return fetch("/rest/LocalizationType/" + id, {
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

  _save({id = -1} = {}){
    console.log("Localization Type _save method for id: "+id);
    const patch = this._fetchPatchPromise({"id":id});
    const attrPromises = this._getAttributePromises({
      "id" : id,
      "entityType" : "LocalizationType"
    });

    const promises = [patch, ...attrPromises];

    // Check if anything changed
    Promise.all(promises).then( async( respArray ) => {
      console.log(respArray);
      let responses = [];
      respArray.forEach((item, i) => {
        console.log(item.status);
        responses.push( item.json() )
      })

        Promise.all( responses )
          .then ( dataArray => {
            let message = "";
            dataArray.forEach((data, i) => {
              console.log("Save response status: "+data.status)
              console.log(data.message);
              message += data.message+"\n";
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

customElements.define("localization-edit", LocalizationEdit);
