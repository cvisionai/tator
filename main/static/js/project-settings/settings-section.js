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
    let formData = this._getFormData(id);
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

  _save({id = -1, globalAttribute = "false"} = {}){
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
                this._handleResponseWithAttributes({
                  id,
                  dataArray,
                  hasAttributeChanges,
                  attrPromises,
                  respArray
                });
            });
        });
      } else {
        this._modalSuccess("Nothing new to save!");
      }
    }

  _getFormData(form){
    // defined inside form web components
    return null;
  }

  _formChanged(_form){
    console.log("Change in "+_form.id);
    let changedFormEl = this._shadow.querySelector(`[id="${_form.id}"] `);

    return changedFormEl.classList.add("changed");
  }



  _handleResponseWithAttributes({
    id = -1,
    dataArray = [],
    hasAttributeChanges = false,
    attrPromises = [],
    respArray = []}
    = {}){

    console.log("hasAttributeChanges: "+hasAttributeChanges);

    respArray.forEach((item, i) => {
      if(item.status == 200 && !hasAttributeChanges){
        console.log("No attr changes - 200 response.");
        return this._modalSuccess(dataArray[i].message);
      } else if(item.status != 200 && !hasAttributeChanges){
        console.log("No attr changes - !200 response.");
        return this._modalError(dataArray[i].message);
      } else if (hasAttributeChanges){
        let message = "<ul>";
        let bumpIndexForAttr = true;
        if (respArray[0].url.indexOf("Attribute") > 0) {
          bumpIndexForAttr = false;
        }
        let index = bumpIndexForAttr ? i-1 : i;

        let formReadable = `"${attrPromises.attrNames[index]}"`
        let formReadable2 = `"${attrPromises.attrNamesNew[index]}"`

        console.log("still have this data?");
        console.log(attrPromises.attrNames);

        message += "<li>"
        if(item.status == 200){
          let succussIcon = document.createElement("modal-success").innerHTML;
          message += dataArray[i].message != ""
            ? succussIcon + dataArray[i].message+"<br/>"
            : "Successfully updated "+formReadable;
        } else if(item.status == 400 && dataArray[i].message.indexOf("global") > 0) {
          let input = `<input type="checkbox" name="global" data-attribute-name="${formReadable.replace(/[^\w]|_/g, "-").toLowerCase()}" id="formReadable" class="checkbox"/>`;
          message += `<p>${input} Globally change attribute ${formReadable} to ${formReadable2}?</p>`
        } else {
          message += "Information for "+formReadable+" did not save."+"<br/>";
        }
        message += "</li>";
        message += "</ul>";
        let buttonSave = this._getAttrGlobalTrigger(id);
        this._modalConfirm({
          "titleText" : "Confirmation Required",
          "mainText" : message,
          buttonSave
        });
      }

    });


  }

  _getAttrGlobalTrigger(id){
    let buttonSave = document.createElement("button")
    buttonSave.setAttribute("class", "btn btn-clear f2 text-semibold");
    buttonSave.innerHTML = "Confirm";

    buttonSave.addEventListener("click", (e) => {
      e.preventDefault();
      let confirmCheckboxes = this._shadow.querySelectorAll("input[name='global']");
      console.log(confirmCheckboxes);
      for(let check of confirmCheckboxes){
        console.log("Checkbox....");
        if(check.value == true){
          //add and changed flag back to this one
          console.log("User checked: "+check.attributeName);
          let name = check.attributeName;
          this._shadow.querySelector(`#${name}`)
        }
      }
      //run the _save method again with global true
      this._save({"id" : id, "globalAttribute" : "true"})
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

  _modalNeutral(message){
    this._modalClear();
    let text = document.createTextNode("");
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

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


    /*let buttonSave = document.createElement("button")
    buttonSave.setAttribute("class", "btn btn-clear f2 text-semibold");
    buttonSave.innerHTML = "Confirm";*/

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
