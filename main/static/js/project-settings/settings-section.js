class SettingsSection extends TatorPage {
  constructor() {
    super();

    // Required helpers.
    this.boxHelper = new SettingsBox("media-types-main-edit");
    this.inputHelper = new SettingsInput("media-types-main-edit");

    // Main Div to append content is an "item" for sideNav.
    this.mainDiv = document.createElement("div");

    // Prep the modal.
    this.modal = document.createElement("modal-dialog");
    this.mainDiv.appendChild(this.modal);
  }

  // Run init when project-id attribute added to page.
  static get observedAttributes() {
    return ["_data"].concat(TatorPage.observedAttributes);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "_data":
        this._init();
        break;
    }
  };

  _init(){
    console.log(`${this.tagName} init.`);

    this.data = JSON.parse( this.getAttribute("_data") );
    console.log(this.data);

    this.projectId = this._setProjectId();

    this.mainDiv.appendChild( this._getSectionForm() )
    this.mainDiv.appendChild( this._getSubmitDiv() );

    return this.mainDiv;
  }

  _setProjectId(){
    // Default
    return this.data.id;
  }

  _getSectionForm(){
    // Overridden in child element.
    return null;
  }

  _getSubmitDiv(){
    // Save button and reset link.
    const submitDiv = document.createElement("div");
    submitDiv.setAttribute("class", "d-flex flex-items-center flex-justify-center py-3");

    this.saveButton = this.inputHelper.saveButton();
    submitDiv.appendChild(this.saveButton);

    this.resetLink = this.inputHelper.resetLink();
    submitDiv.appendChild(this.resetLink);

    this.saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      if( this.changed() ){
        this.save();
      } else {
        // @TODO Save button should not be clickable unless something changes in form.
        console.log("Nothing new to save! :)");
      }
    });

    // Form reset event
    this.resetLink.addEventListener("click", (event) => {
      event.preventDefault();
      this.reset();
      console.log("Reset complete.");
    });

    return submitDiv;
  }

  _getNewValue(input){
    return input.getAttribute("value");
  }

  _changed(){

  }

  _fetchGetPromise(){
    // Set in child element,
    return null;
  }

  _fetchPatchPromise(){

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

  _modalSuccess(message){
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    return this.modal.setAttribute("is-open", "true")
  }

  _modalError(message){
    let text = document.createTextNode(" Error saving project details");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-warning") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    return this.modal.setAttribute("is-open", "true")
  }

  _save(){

  }

  _reset(){

  }

  _hardReset(){

  }

  getDom(){
    return this._shadow;
  }

}

customElements.define("settings-section", SettingsSection);
