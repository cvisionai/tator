class SettingsSection extends TatorElement {
  constructor() {
    super();

    // Required helpers.
    this.boxHelper = new SettingsBox("media-types-main-edit");
    this.inputHelper = new SettingsInput("media-types-main-edit");

    // Main Div to append content is an "item" for sideNav.
    this.settingsSectionDiv = document.createElement("div");

    // Prep the modal.
    this.modal = document.createElement("modal-dialog");
    this.settingsSectionDiv.appendChild(this.modal);
  }

  _init(data){
    console.log(`${this.tagName} init.`);

    this.data = JSON.parse( data );
    console.log(this.data);

    this.projectId = this._setProjectId();

    this.settingsSectionDiv.appendChild( this._getSectionForm() )
    this.settingsSectionDiv.appendChild( this._getSubmitDiv({ "id":this.projectId}) );

    return this.settingsSectionDiv;
  }

  _setProjectId(){
    // Default
    return this.data.id;
  }

  _getSectionForm(){
    // Overridden in child element.
    return null;
  }


    setSideNav(dom){
      return this._sideNavDom = dom;
    }

  _getSubmitDiv({id = -1} = {}){
    // Save button and reset link.
    const submitDiv = document.createElement("div");
    submitDiv.setAttribute("class", "d-flex flex-items-center flex-justify-center py-3");

    this.saveButton = this.inputHelper.saveButton();
    submitDiv.appendChild(this.saveButton);

    this.resetLink = this.inputHelper.resetLink();
    submitDiv.appendChild(this.resetLink);

    this.saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      if( this._changed() ){
        console.log("hitting save for id: "+id);
        this._save( {"id":id} )
      } else {
        // @TODO Save button should not be clickable unless something changes in form.
        console.log("Nothing new to save! :)");
        this._modalNeutral("Nothing new to save!");
      }
    });

    // Form reset event
    this.resetLink.addEventListener("click", (event) => {
      event.preventDefault();
      this.reset(id)
      console.log("Reset complete.");
    });

    return submitDiv;
  }

  _getNewValue(input){
    return input.getAttribute("value");
  }

  _changed(){
    return true;
  }

  _fetchGetPromise(){
    // Set in child element,
    return null;
  }

  _fetchPatchPromise(){
    // Set in child element,
    return null;
  }

  _fetchWrapper(){

  }

  _fetchNewProjectData(){
    let get = this._fetchGetPromise();

    get.then( r => r.json())
    .then( data => {
        // Init project edit box.
        this.data = data;
        console.log("Data Updated.");
        console.log(data);
      })
      .catch(err => {
        console.error("Failed to retrieve data: " + err);
      });
  }

  _save({id = -1} = {}){
    console.log("Default _save method for id: "+id);
    const patch = this._fetchPatchPromise({"id":id});
    console.log(patch);
    // Check if anything changed
    patch.then(response => {
        return response.json().then( data => {
          console.log("Save response status: "+response.status)
          if (response.status == "200") {
            this._modalSuccess(data.message);
            this._fetchNewProjectData();
          } else {
            this._modalError(data.message);
          }
        })
      }
    )
    .catch(error => {
      console.log('Error:', error.message);
      this._modalError("Internal error: "+error.message);
    });
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

  _getAttributePromises({id = -1, entityType = null} = {}){
    let attrForms = this._shadow.querySelectorAll(`.item-group-${id} settings-attributes .attribute-form`);
    let attrPromises = {};
    attrPromises.promises = [];
    attrPromises.attrNames = [];

    console.log(attrForms.length);

    attrForms.forEach((form, i) => {
      let formData = {
        "entity_type": entityType,
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

  _modalSuccess(message){
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    return this.modal.setAttribute("is-open", "true")
  }

  _toggleChevron(e){
    var el = e.target;
    return el.classList.toggle('chevron-trigger-90');
  }

  _modalError(message){
    let text = document.createTextNode(" Error saving project details");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-warning") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    return this.modal.setAttribute("is-open", "true")
  }

  _modalNeutral(message){
    let text = document.createTextNode("");
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    return this.modal.setAttribute("is-open", "true")
  }

  _toggleAttributes(e){
    let el = e.target.parentNode.nextSibling;
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  _reset(){

  }

  _hardReset(){

  }

  getDom(){
    return this._shadow;
  }

  // name
  _getNameFromData({ data = this.data} = {}){
    return data.name;
  }

  _setNameInput(name){
    let key = "name"
    return this.inputHelper.inputText( { "labelText": "Name", "name": key, "value": name } );
  }

  _getNameInputValue(){
    return this._editName.querySelector("input").value;
  }

  _setNameInputValue(newValue){
    return this._editName.querySelector("input").value = newValue;
  }

  // summary
  _getSummaryFromData({ data = this.data} = {}){
    return data.summary;
  }

  _setSummaryInput(summary){
    let key = "summary";
    return this.inputHelper.inputText( { "labelText": "Summary", "Name": key, "value": summary } )
  }

  _getSummaryInputValue(){
    return this._editSummary.querySelector("input").value;
  }

  _setSummaryInputValue(newValue){
    return this._editSummary.querySelector("input").value = newValue;
  }

  // description
  _getDescriptionFromData({ data = this.data} = {}){
    return data.description;
  }

  _setDescriptionInput(description){
    let key = "description";
    return this.inputHelper.inputText( { "labelText": "Description", "name": key, "value": description } )
  }

  _getDescriptionInputValue(){
    return this._editDescription.querySelector("input").value;
  }

  _setDescriptionInputValue(newValue){
    return this._editDescription.querySelector("input").value = newValue;
  }

}

customElements.define("settings-section", SettingsSection);
