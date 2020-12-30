class LeafTypeEdit extends SettingsSection {
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
      itemDiv.id = `itemDivId-leaf-${this.data[i].id}`; //#itemDivId-${type}-${itemId}
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
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

      // Only editable items inside this form
      this._form = document.createElement("form");
      this._form.id = data.id;
      current.appendChild( this._form );

      // append input for name
      const NAME = "Name";
      this._form.appendChild( this.inputHelper.inputText({ "labelText": NAME, "name": NAME.toLowerCase(), "value": data[NAME.toLowerCase()]}) );

      //description
      const DESCRIPTION = "Description";
      current.appendChild( this.inputHelper.inputText( { "labelText": DESCRIPTION, "name": DESCRIPTION.toLowerCase(), "value": data[DESCRIPTION.toLowerCase()] } ) );

      // append input for name
      const DTYPE = "Dtype";
      current.appendChild( this.inputHelper.inputSelectOptions(
        { "labelText": DTYPE, "name": DTYPE.toLowerCase(), "value": data[DTYPE.toLowerCase()], "optionsList" : ["box", "line", "dot"]}
      ) );

      // attribute types
      if(data.attribute_types.length > 0){
        this.attributeSection = document.createElement("settings-attributes");
        this.attributeSection._init("LEAF", data.attribute_types);
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
      obj[key] = formData.get(key);
    }
    console.log(obj);
    return obj;
  }

  _getAttributePromises(id){
    let attrForms = this._shadow.querySelectorAll(`.item-group-${id} settings-attributes .attribute-form`);
    let attrPromises = [];

    console.log(attrForms.length);

    attrForms.forEach((form, i) => {
      let formData = {
        "entity_type": "LeafType",
        "old_attribute_type_name": form.id,
        "new_attribute_type": {}
      };

      formData.new_attribute_type = this._getFormData(form);

      console.log(formData);

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
      attrPromises.push(currentPatch);
    });
    return attrPromises;
  }

  _save({id = -1} = {}){
    console.log("Leaf Type _save method for id: "+id);
    const patch = this._fetchPatchPromise({"id":id});
    const attrPromises = this._getAttributePromises(id);

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

  _fetchGetPromise({id = this.projectId} = {}){
    return fetch("/rest/LeafTypes/" + id, {
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
    return fetch("/rest/LeafType/" + id, {
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

}

customElements.define("leaf-type-edit", LeafTypeEdit);
