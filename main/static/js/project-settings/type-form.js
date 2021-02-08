class TypeForm extends TatorElement {
  constructor() {
    super();

    // Correct name for the type, ie. "LocalizationType"
    this.typeName = "";
    this.readableTypeName = "Media Type";

    // Main Div to append content is an "item" for sideNav.
    this.typeFormDiv = document.createElement("div");
    this.typeFormDiv.setAttribute("class", "pl-md-6")
    this._shadow.appendChild(this.typeFormDiv);
    this.bgdimmer = this._shadow.querySelector("background-dimmer");

    // Required helpers.
    this.boxHelper = new SettingsBox( this.typeFormDiv, this.bgdimmer );
    this.inputHelper = new SettingsInput("");
    this.attributeFormHelper = new AttributesForm();
    this.loading = new LoadingSpinner();
    this._shadow.appendChild( this.loading.getImg());
  }

  _init(data){
    console.log(`${this.readableTypeName} init.`);
    console.log(data);
    //this.data = JSON.parse( data );
    this.data = data;

    if(!this.data.form && !this.data.form != "empty"){
      console.log(this.data);
      this.projectId = this.data.project;
      this.typeId = this.data.id

      // Section h1.
      const h1 = document.createElement("h1");
      h1.setAttribute("class", "h2 pb-3 edit-project__h1");
      const t = document.createTextNode(`${this.readableTypeName} settings.`); 
      h1.appendChild(t);
      this.typeFormDiv.appendChild(h1);

      this.typeFormDiv.appendChild( this._getSectionForm( this.data) );
      this.typeFormDiv.appendChild( this._getAttributeSection( ) );
      this.typeFormDiv.appendChild( this._getSubmitDiv( {"id": this.data.id }) );

      this.typeFormDiv.appendChild( this.deleteTypeSection() );

      console.log("Init complete.");
      return this.typeFormDiv;
    } else {
      this.projectId = this.data.project;

      // Section h1.
      const h1 = document.createElement("h1");
      h1.setAttribute("class", "h2 pb-3 edit-project__h1");
      const t = document.createTextNode(`Add New ${this.readableTypeName}.`); 
      h1.appendChild(t);
      this.typeFormDiv.appendChild(h1);

      this.typeFormDiv.appendChild( this._getSectionForm( this._getEmptyData() ) );

      const inputSubmit = document.createElement("input");
      inputSubmit.setAttribute("type", "submit");
      inputSubmit.setAttribute("value", "Save");
      inputSubmit.setAttribute("class", `btn btn-clear f1 text-semibold`);
      this.savePost = inputSubmit;

      this.savePost.addEventListener("click", this._savePost.bind(this));
      this.typeFormDiv.appendChild( this.savePost );
      
      return this.typeFormDiv;
    }
  }

  _savePost(){
    let addNew = new TypeNew({
      "type" : this.typeName,
      "projectId" : this.projectId
    });

    let formData = this._getFormData("New", true);
    addNew.saveFetch(formData).then((data) => {
      console.log(data.message);
      return this.boxHelper._modalComplete(data.message);
    });
  }

  //
  _getSubmitDiv({id = -1} = {}){
    const submitDiv = document.createElement("div");
    submitDiv.setAttribute("class", "d-flex flex-items-center flex-justify-center py-3");

    // Save button and reset link
    submitDiv.appendChild( this._saveEntityButton(id) );
    submitDiv.appendChild( this._resetEntityLink(id) );

    return submitDiv;
  }

  _getAttributeSection(){
    this.attributeSection = document.createElement("attributes-main");
    this.attributeSection._init(this.typeName, this.data.id, this.data.project, this.data.attribute_types);

    return this.attributeSection;
  }

  _saveEntityButton(id){
    this.saveButton = this.inputHelper.saveButton();
    this.saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      if( this._shadow.querySelectorAll(".changed").length > 0 ){
        console.log("Save for id: "+id);
        this._save( {"id":id} )
      } else {
        // @TODO- UX Save button disabled until form change
        let happyMsg = "Nothing new to save!";
        this.boxHelper._modalSuccess( happyMsg );
      }
    });
    return this.saveButton;
  }

  _resetEntityLink(id){
    this.resetLink = this.inputHelper.resetLink();

    // Form reset event
    this.resetLink.addEventListener("click", (event) => {
      event.preventDefault();
      this.reset(id)
      console.log("Reset complete.");
    });
    return this.resetLink;
  }

  // form with parts put together
  _getForm({inputs = [], id = -1}){
    let _form = document.createElement("form");
    _form.id = data.id;
    current.appendChild( _form );

    return _form.addEventListener("change", (event) => {
      this._formChanged(_form, event);
    });
  }

  _getHeading(){
    let headingSpan = document.createElement("span");
    let labelSpan = document.createElement("span");
    labelSpan.setAttribute("class", "item-label");
    let t = document.createTextNode(`${this.readableTypeName}`); 
    labelSpan.appendChild(t);
    headingSpan.innerHTML = this.icon;
    headingSpan.appendChild(labelSpan);

    return headingSpan;
  }

  deleteTypeSection(){
    // let deleteSection = new TypeDelete({
    //   "type" : this.typeName,
    //   "projectId" : this.projectId,
    //   "typeFormDiv" : this.typeFormDiv,
    // });
    let deleteIcon = new DeleteButton();

    return this.boxHelper.boxWrapDelete({
      "children" : document.createTextNode(`${deleteIcon} Delete?`)
    });
  }

  _getEmptyData() {
    return {
      "id" : `New`,
      "name" : "",
      "description" : "",
      "visible" : false,
      "grouping_default" : false,
      "media" : [],
      "dtype" : "",
      "delete_child_localizations" : false,
      "form" : "empty"
    };
  }


  // FETCH FROM MODEL PROMISE STRUCTURE
  // GET
  _fetchGetPromise({id = this.projectId} = {}){
    return fetch(`/rest/${this.typeName}s/${id}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  // PATCH
  _fetchPatchPromise({id = -1 } = {}){
    console.log("Patch id: "+id);
    let formData = this._getFormData(id);
    console.log(formData);

    //return fetch("/rest/StateType/" + id, {
    return fetch(`/rest/${this.typeName}/${id}`, {
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



  _save({id = -1, globalAttribute = false} = {}){
    this.loading.showSpinner();

    let promises = []
    console.log("Settings _save method for id: "+id);

    let mainForm = this._shadow.getElementById(id);
    let mainFormChanged = false;
    if(mainForm.classList.contains("changed")) {
      mainFormChanged = true;
      promises.push( this._fetchPatchPromise({id}) );
    }
    let hasAttributeChanges =false;
    let attrPromises = null;
    let attrForms = this._shadow. querySelectorAll(`.item-group-${id} attributes-main .attribute-form`);
    let attrFormsChanged = this._shadow.querySelectorAll(`.item-group-${id} attributes-main .attribute-form.changed`);

    if(attrFormsChanged.length > 0 ){
      hasAttributeChanges = true;
      attrPromises = this.attributeFormHelper._getAttributePromises({
        id,
        "entityType" : this.typeName,
        globalAttribute,
        attrForms,
        attrFormsChanged
      });
      promises = [...promises, ...attrPromises.promises];
    }

    let messageObj = {};
    if(promises.length > 0){
      // Check if anything changed
      Promise.all(promises).then( async( respArray ) => {
        console.log(respArray);
        let responses = [];
        respArray.forEach((item, i) => {
          responses.push( item.json() )
        });

          Promise.all( responses )
            .then ( dataArray => {
              messageObj = this._handleResponseWithAttributes({
                id,
                dataArray,
                hasAttributeChanges,
                attrPromises,
                respArray
              });

              let message = "";
              let success = false;
              let error = false;
              if(messageObj.messageSuccess) {
                let heading = `<div class=" pt-4 h3 pt-4">Success</div>`;
                message += heading+messageObj.messageSuccess;
                success = true;
              }
              if(messageObj.messageError) {
                let heading = `<div class=" pt-4 h3 pt-4">Error</div>`;
                message += heading+messageObj.messageError;
                error = true;
              }

              if(messageObj.requiresConfirmation) {
                let buttonSave = this._getAttrGlobalTrigger(id);
                let confirmHeading = `<div class=" pt-4 h3 pt-4">Global Change(s) Found</div>`
                let subText = `<div class="f1 py-2">Confirm to update across all types. Uncheck and confirm, or cancel to discard.</div>`
                
                let mainText = `${message}${confirmHeading}${subText}${messageObj.messageConfirm}`;
                this.loading.hideSpinner();
                this.boxHelper._modalConfirm({
                  "titleText" : "Complete",
                  mainText,
                  buttonSave
                });
              } else {
                let mainText = `${message}`;
                this.loading.hideSpinner();
                this.boxHelper._modalNeutral({
                  "titleText" : "Complete",
                  mainText
                });
                // Reset forms to the saved data from model
                this.resetHard(id);
              }
          }).then( () => {
            console.log(this);
            // Reset changed flag
            for(let f in attrFormsChanged) f.classList.remove("changed");
            let mainForm = this._shadow.getElementById(id);
            if(mainForm.classList.contains("changed")) mainForm.classList.remove("changed");
            
            let attrFormsChanged = this._shadow.querySelectorAll(`.item-group-${id} attributes-main .attribute-form.changed`);
            if(attrFormsChanged.length > 0 ) {
              for(let f of attrFormsChanged) f.classList.remove("changed");
            }
          
          });

        }).catch(err => {
          console.error("File "+ err.fileName + " Line "+ err.lineNumber +"\n" + err);
          this.loading.hideSpinner();
        });
    } else {
      this.boxHelper._modalSuccess("Nothing new to save!");
    }


  }

  _formChanged( _form, event = "") {
    console.log("Change in "+_form.id);
    let changedFormEl = this._shadow.querySelector(`[id="${_form.id}"] `);

    if(event != "") console.log("Change value... "+event.target.value);

    return changedFormEl.classList.add("changed");
  }



  _handleResponseWithAttributes({
    id = -1,
    dataArray = [],
    hasAttributeChanges = false,
    attrPromises = [],
    respArray = []}
    = {}){

    let messageSuccess = "";
    let messageError = "";
    let messageConfirm = "";
    let requiresConfirmation = false;

    respArray.forEach((item, i) => {
      let currentMessage = dataArray[i].message;
      let succussIcon = document.createElement("modal-success");
      let iconWrap = document.createElement("span");
      let warningIcon = document.createElement("modal-warning");
      let index = (hasAttributeChanges && respArray[0].url.indexOf("Attribute") > 0) ? i : i-1;
      let formReadable = hasAttributeChanges ? attrPromises.attrNames[index] : "";
      let formReadable2 = hasAttributeChanges ? attrPromises.attrNamesNew[index] : "";

      if( item.status == 200){
        console.log("Return Message - It's a 200 response.");
        iconWrap.appendChild(succussIcon);
        messageSuccess += `<div class="py-2">${iconWrap.innerHTML} <span class="v-align-top">${currentMessage}</span></div>`;
      } else if(item.status != 200){
        if (!hasAttributeChanges ){
          iconWrap.appendChild(warningIcon);
          console.log("Return Message - It's a 400 response for main form.");
          messageError += `<div class="py-2">${iconWrap.innerHTML} <span class="v-align-top">${currentMessage}</span></div>`;
        } else if(hasAttributeChanges && currentMessage.indexOf("global") > 0) {
          console.log("Return Message - It's a 400 response for attr form.");
          let input = `<input type="checkbox" checked name="global" data-old-name="${formReadable}" class="checkbox"/>`;
          let newName = formReadable == formReadable2 ? "" : ` new name "${formReadable2}"`
          messageConfirm += `<div class="py-2">${input} Attribute "${formReadable}" ${newName}</div>`
          requiresConfirmation = true;            
        } else {
          iconWrap.appendChild(warningIcon);
          messageError += `<div class="py-4">${iconWrap.innerHTML} <span class="v-align-top">Changes editing ${formReadable} not saved.</span></div>`
          messageError += `<div class="f1">Error: ${currentMessage}</div>`
        }
      }
    });

    return {requiresConfirmation, messageSuccess, messageConfirm, messageError};
  }

  _getAttrGlobalTrigger(id){
    let buttonSave = document.createElement("button")
    buttonSave.setAttribute("class", "btn btn-clear f1 text-semibold");
    buttonSave.innerHTML = "Confirm";

    buttonSave.addEventListener("click", (e) => {
      e.preventDefault();
      let confirmCheckboxes = this.boxHelper._modalDom().querySelectorAll('[name="global"]');
      this.boxHelper._modalCloseCallback();
         
      console.log(confirmCheckboxes);
      for(let check of confirmCheckboxes){
        //add and changed flag back to this one
        console.log(check);
        let name = check.dataset.oldName;
        let formId = `${name.replace(/[^\w]|_/g, "").toLowerCase()}_${id}`;

        //add back changed flag
        this._shadow.querySelector(`#${formId}`).classList.add("changed");

        if(check.checked == true){
          console.log("User marked as global: "+name);
          this._shadow.querySelector(`#${formId}`).dataset.isGlobal = "true";
        } else {
          console.log("User marked NOT global, do not resend: "+name);

          //this._shadow.querySelector(`#${formId}`).dataset.isGlobal = "false";
        }
      }

      //run the _save method again with global true
      this._save({"id" : id, "globalAttribute" : true})
    });

    return buttonSave
  }

  _toggleChevron(e){
    var el = e.target;
    return el.classList.toggle('chevron-trigger-90');
  }

  _toggleAttributes(e){
    let el = e.target.parentNode.nextSibling;
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  

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

  _nameChanged() {
    console.log(this.data.name);
    if (this._getNameInputValue() === this._getNameFromData()) return false;
    return true;
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

  _summaryChanged() {
    if (this._getSummaryInputValue() === this._getSummaryFromData()) return false;
    return true;
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

  

  // RESET FUNCTIONS
  reset(scope){
    let itemDiv = this._shadow.querySelector(`#itemDivId-${this.typeName}-${scope}`);
    let itemH = this._shadow.querySelector(`#itemDivId-${this.typeName}-${scope} h1`);
    let itemData = this._findItemDataById(scope);

    if(itemData != false){
      itemDiv.innerHTML = '';
      itemDiv.appendChild( itemH );
      itemDiv.appendChild( this._getSectionForm(itemData) );
      itemDiv.appendChild( this._getAttributeSection( ) );
      itemDiv.appendChild( this._getSubmitDiv( {"id": scope } ) );
      return itemDiv;
    }

    // if we somehow get here, just refreshing page will data?
    return setTimeout(function(){ location.reload(); }, 3000);;
  }

  resetHard(scope){
    console.log("reset hard");
    this._fetchNewProjectData(scope).then( (data) => {
      return this.reset(scope);
    });

  }

  _findItemDataById(id){
    for(let x in this.data){
      if (this.data[x].id == id) return this.data[x];
    }
    return false;
  }

  _fetchNewProjectData(){
    //
    return this._fetchGetPromise().then(data => data.json).then( data => {
        return data = this.data;
      }     
    );
  }

}

customElements.define("type-form", TypeForm);