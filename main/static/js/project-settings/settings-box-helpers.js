/* Class with methods return content in a styled DIV boxes.*/
class SettingsBox {
  constructor( mainDiv) {

    this.modal = document.createElement("modal-dialog");
    this.mainDiv = mainDiv;

    this.mainDiv.appendChild(this.modal);
  }

  boxWrapDefault( { children = {}, level = 1, customClass = ""} = {} ){
    let settingsBox = document.createElement("div");
    settingsBox.setAttribute("class", `py-3 px-6 rounded-2 ${customClass} ${level == 1 ? ' edit-project__config ' : ''}`);
    settingsBox.append( children );

    return settingsBox;
  }

  headingWrap( {
    headingText = "",
    descriptionText = "",
    level = 1,
    collapsed = false,
    callback = ""} = {}
  ){
    /* Div to apppend the a HEADING and DESCRIPTION to. */
    let headingDiv = document.createElement("div");
    headingDiv.setAttribute("class", "dflex flex-items-center py-2 px-2 ");

    /* 1. Make HEADING. */
    let heading = null;

    switch(level){
      case 1:
        heading = document.createElement("h1");
        break;
      case 2:
        heading = document.createElement("h2");
        break;
      case 3:
        heading = document.createElement("h3");
        break;
      case 4:
        heading = document.createElement("h4");
        break;
      default:
        heading = document.createElement("h2");
      }

    let _headingText = document.createTextNode("");
    _headingText.nodeValue = headingText;
    heading.appendChild( _headingText );

    let description = document.createElement("div");

    if(collapsed) {
      heading.setAttribute("class", "py-1 col-12 d-inline-flex clickable");
      heading.appendChild(this._chevron());
    } else {
      heading.setAttribute("class", "py-1 col-12 d-inline-flex ");

      //let _descriptionText = document.createTextNode("");
      //_descriptionText.nodeValue = descriptionText;
      //description.setAttribute("class", "f2 text-gray d-inline-flex ");
      //description.appendChild( _descriptionText );
    }

    /* 3. Append to parent DIV element. */
    headingDiv.appendChild(heading);
    headingDiv.appendChild(description);

    return headingDiv;
  }

  hiddenBoxWrap( { heading = "Section", children = {}, level = 2 } = {} ){
    let _hiddenWrapper = document.createElement("div");

    let _collapsedBoxHeading = this.headingWrap({"headingText": heading, "level":2, "collapsed":true})
    _hiddenWrapper.append( _collapsedBoxHeading );

    let _collapsedBox = document.createElement("div");
    _hiddenWrapper.append( children );

    return panel;
  }

  _chevron() {
    const chevron = document.createElementNS(svgNamespace, "svg");
    chevron.setAttribute("class", "chevron");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("height", "1em");
    chevron.setAttribute("width", "1em");

    const chevronPath = document.createElementNS(svgNamespace, "path");
    chevronPath.setAttribute("d", "M9.707 18.707l6-6c0.391-0.391 0.391-1.024 0-1.414l-6-6c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5.293 5.293-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0z");

    chevron.appendChild(chevronPath);

    return chevron;
  }

  // MODAL
  _modalSuccess(message){
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    //this.modal._main.classList.add("fixed-heigh-scroll");

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
    if(titleText != "") this.modal._titleDiv.append(titleText);
    this.modal._main.innerHTML = mainText;

    return this.modal.setAttribute("is-open", "true")
  }

  _modalConfirm({
    titleText = "",
    mainText = "",
    buttonSave = document.createElement("button"),
    scroll = true
  } = {}){
    this._modalClear();
    this.modal._titleDiv.innerHTML = titleText;

    if(mainText.nodeType == Node.ELEMENT_NODE){
      this.modal._main.appendChild(mainText);
    } else {
      this.modal._main.innerHTML = mainText;
    }
    
    if(scroll) this.modal._main.classList.add("fixed-heigh-scroll");

    let buttonClose = document.createElement("button")
    buttonClose.setAttribute("class", "btn btn-clear f2 text-semibold");
    buttonClose.innerHTML = "Cancel";

    buttonClose.addEventListener("click", this.modal._closeCallback);

    this.modal._footer.appendChild(buttonSave);
    this.modal._footer.appendChild(buttonClose);

    return this.modal.setAttribute("is-open", "true")
  }

  _modalComplete(message){
    this._modalClear();
    let text = document.createTextNode("Complete");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    this.modal._footer.innerHTML = "";
    this.modal._main.classList.remove("fixed-heigh-scroll");

    return this.modal.setAttribute("is-open", "true")
  }

  _modalClear(){
    this.modal._titleDiv.innerHTML = "";
    this.modal._main.innerHTML = "";
    this.modal._footer.innerHTML = "";

    return this.modal;
  }

  _modalCloseCallback(){
    return this.modal._closeCallback();
  }

  _modalDom(){
    return this.modal._shadow;
  }

  /*_modalSuccess(message){
    this.boxHelper._modalClear();
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    this.modal._main.classList.add("fixed-heigh-scroll");

    return this.modal.setAttribute("is-open", "true")
  }

  _modalError(message){
    this.boxHelper._modalClear();
    let text = document.createTextNode(" Error saving project details");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-warning") );
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
    this.boxHelper._modalClear();
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
  }*/

}
