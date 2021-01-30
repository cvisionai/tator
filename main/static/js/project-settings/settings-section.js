class SettingsSection extends TatorElement {
  constructor() {
    super();

    // Required helpers.
    this.boxHelper = new SettingsBox("media-types-main-edit");
    this.inputHelper = new SettingsInput("media-types-main-edit");
    this.attributeFormHelper = new AttributesForm();

    // Main Div to append content is an "item" for sideNav.
    this.settingsSectionDiv = document.createElement("div");

    // Prep the modal.
    this.modal = document.createElement("modal-dialog");
    this.settingsSectionDiv.appendChild(this.modal);

    const myDom = this.getDom();

    // Unsaved changes warning
    /*window.addEventListener("beforeunload", function (e) {
      e.preventDefault();
      let changes = myDom.querySelectorAll(".changed");
      console.log("changes?");
      console.log(myDom);
      if(changes.length > 0){
        console.log("Changes could be lost...");
        var confirmationMessage = 'You have unsaved changes in [specify here]'
                                + 'If you leave before saving, your changes will be lost.';

        (e || window.event).returnValue = confirmationMessage; //Gecko + IE
        return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
      } else {
        console.log("No changes...");
      }
    });*/
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

      if( this._shadow.querySelectorAll(".changed").length > 0 ){
        console.log("hitting save for id: "+id);
        this._save( {"id":id} )
      } else {
        // @TODO-Improvement Save button should not be clickable unless something changes in form.
        let happyMsg = "Nothing new to save!";
        console.log(happyMsg);
        this._modalSuccess( happyMsg );
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

  _fetchGetPromise({id = this.projectId} = {}){
    return fetch(`/rest/${this.fromType}s/${id}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  //shared by types
  _fetchPatchPromise({id = -1 } = {}){
    console.log("Patch id: "+id);
    let formData = this._getFormTypeData(id);
    console.log(formData);

    //return fetch("/rest/StateType/" + id, {
    return fetch(`/rest/${this.fromType}/${id}`, {
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

  _save({id = -1, globalAttribute = false} = {}){
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
      let attrForms = this._shadow. querySelectorAll(`.item-group-${id} settings-attributes .attribute-form`);
      let attrFormsChanged = this._shadow.querySelectorAll(`.item-group-${id} settings-attributes .attribute-form.changed`);

      if(attrFormsChanged.length > 0 ){
        hasAttributeChanges = true;
        attrPromises = this.attributeFormHelper._getAttributePromises({
          id,
          "entityType" : this.fromType,
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

                if(messageObj.requiresConfirmation) {
                  console.log(messageObj);
                  let buttonSave = this._getAttrGlobalTrigger(id);
                  let heading = `<div class="py-4 pt-4 h2">Confirm global changes</div>`
                  let subText = `<div class="f2 py-4">Selecting a checkbox vonfirms update to this attribute across all types.</div>`
                  let mainText = `${messageObj.message}${heading}${subText}${messageObj.messageConfirm}`

                  this._modalConfirm({
                    "titleText" : "Confirm Changes",
                    mainText,
                    buttonSave
                  });
                } else {
                  this._modalNeutral({
                    "titleText" : "Edit complete!",
                    "mainText" : messageObj.message 
                  });
                }            
            });

          });
      } else {
        this._modalSuccess("Nothing new to save!");
      }


    }

  _getFormTypeData(id){
    this._shadow.getElementById(id).classList.remove("changed");
    return this._getFormData(id);
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

    let message = "";
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
        message += `<div class="py-2">${iconWrap.innerHTML} ${currentMessage}</div>`;
      } else if(item.status != 200){
        if (!hasAttributeChanges ){
          iconWrap.appendChild(warningIcon);
          console.log("Return Message - It's a 400 response for main form.");
          message += `<div class="py-2">${iconWrap.innerHTML} ${currentMessage}</div>`;
        } else if(hasAttributeChanges && currentMessage.indexOf("global") > 0) {
          console.log("Return Message - It's a 400 response for attr form.");
          let input = `<input type="checkbox" checked name="global" data-old-name="${formReadable}" class="checkbox"/>`;
          let newName = formReadable == formReadable2 ? "" : ` new name "${formReadable2}"`
          messageConfirm += `<div class="py-2">${input} Attribute "${formReadable}" ${newName}</div>`
          requiresConfirmation = true;            
        } else {
          iconWrap.appendChild(warningIcon);
          message += `<div class="py-4">${iconWrap.innerHTML} Changes editing ${formReadable} not saved.</div>`
          message += `<div class="f3">Error: ${currentMessage}</div>`
        }
      }
    });

    return {requiresConfirmation, message, messageConfirm};
  }

  _getAttrGlobalTrigger(id){
    let buttonSave = document.createElement("button")
    buttonSave.setAttribute("class", "btn btn-clear f2 text-semibold");
    buttonSave.innerHTML = "Confirm";

    buttonSave.addEventListener("click", (e) => {
      e.preventDefault();
      let confirmCheckboxes = this.modal._shadow.querySelectorAll('[name="global"]');

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

  _modalSuccess(message){
    this._modalClear();
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    this.modal._main.classList.add("fixed-heigh-scroll");

    return this.modal.setAttribute("is-open", "true")
  }

  _modalError(message){
    this._modalClear();
    let text = document.createTextNode(" Error saving project details");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-warning") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    return this.modal.setAttribute("is-open", "true")
  }

  _modalNeutral({
    titleText = "",
    mainText = "",
  } = {}){
    this._modalClear();
    let text = document.createTextNode("");
    this.modal._titleDiv.append(titleText);
    this.modal._main.innerHTML = mainText;

    return this.modal.setAttribute("is-open", "true")
  }

  _modalConfirm({
    titleText = "",
    mainText = "",
    buttonText = "",
    buttonSave = document.createElement("button")
  } = {}){
    this._modalClear();
    this.modal._titleDiv.innerHTML = titleText;
    this.modal._main.innerHTML = mainText;
    this.modal._main.classList.add("fixed-heigh-scroll");

    let buttonClose = document.createElement("button")
    buttonClose.setAttribute("class", "btn btn-clear f2 text-semibold");
    buttonClose.innerHTML = "Cancel";

    buttonClose.addEventListener("click", this.modal._closeCallback);

    this.modal._footer.appendChild(buttonSave);
    this.modal._footer.appendChild(buttonClose);

    return this.modal.setAttribute("is-open", "true")
  }

  _modalClear(){
    this.modal._titleDiv.innerHTML = "";
    this.modal._main.innerHTML = "";
    this.modal._footer.innerHTML = "";
    return this.modal;
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

  _getCompiledMediaList( mediaIds, projectMediaList ){
    let newList = [];

    // pop off any that match into a new list with the checked true info
    // then just loop the remaining list into new list with checked false

    projectMediaList.forEach((media, i) => {
      for(let id of mediaIds ){
        if (media.id == id ) {
          return newList.push({
            "id" : media.id,
            "name" : media.name,
            "checked" : true
          });
        }
      }
      return newList.push({
        "id" : media.id,
        "name" : media.name,
        "checked" : false
      });
    });

    return newList;
  }

}

customElements.define("settings-section", SettingsSection);
