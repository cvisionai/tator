import { svgNamespace } from "../components/tator-element.js";

/* Class with methods return content in a styled DIV boxes.*/
export class SettingsBox {
  constructor( modal ) {

    this.modal = modal;

  }

  boxWrapDefault( { children = {}, level = 1, customClass = ""} = {} ){
    let settingsBox = document.createElement("div");
    settingsBox.setAttribute("class", `py-3 rounded-2 ${customClass} ${level == 1 ? ' edit-project__config ' : ''}`);
    settingsBox.append( children );

    return settingsBox;
  }

  boxWrapDelete( { children = {}, level = 1, customClass = ""} = {} ){
    let settingsBox = document.createElement("div");
    settingsBox.setAttribute("class", `text-red py-3 rounded-2 ${customClass} edit-project__config`);
    settingsBox.style.border = "1px solid $color-charcoal--light";
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
    headingDiv.setAttribute("class", "clearfix py-2");

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
      if(descriptionText != "") {
        heading.setAttribute("class", "py-1 float-left col-md-3 col-sm-4");

        let _descriptionText = document.createTextNode("");
        _descriptionText.nodeValue = descriptionText;
        description.setAttribute("class", "f1 text-gray float-left col-md-9 col-sm-8");
        description.appendChild( _descriptionText );
      } else {
        heading.setAttribute("class", "py-1 col-12 d-inline-flex ");
      }
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
  // @TODO attributes main still using these, but form has its own
  _modalSuccess(message){
    this._modalClear();
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    //this.modal._main.classList.add("fixed-height-scroll");

    // let buttonContinue = document.createElement("button");
    // buttonContinue.setAttribute("class", "btn background-green f1 text-semibold");
    
    // let confirmTextContinue = document.createTextNode("OK")
    // buttonContinue.appendChild(confirmTextContinue);
    
    // this.modal._footer.appendChild(buttonContinue);
    // buttonContinue.addEventListener("click", this.modal._closeCallback);

    this.modal.setAttribute("is-open", "true");
    this.modal.fadeOut();
  }

  _modalSuccessConfirm({
    mainText = "",
    buttonContinue = document.createElement("button"),
    buttonExit = document.createElement("button"),
    scroll = true
  } = {}){
    
    this._modalClear();
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-success") );
    this.modal._titleDiv.append(text);

    if(mainText.nodeType == Node.ELEMENT_NODE){
      this.modal._main.appendChild(mainText);
    } else {
      this.modal._main.innerHTML = mainText;
    }
    
    if(scroll) this.modal._main.classList.add("fixed-height-scroll");

    this.modal._footer.appendChild(buttonContinue);
    this.modal._footer.appendChild(buttonExit);
    return this.modal.setAttribute("is-open", "true");
  }

  _modalError(message, title = " Error saving project details"){  
    this._modalClear();
    let text = document.createTextNode(title);
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append( document.createElement("modal-warning") );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;

    let buttonContinue = document.createElement("button");
    buttonContinue.setAttribute("class", "btn f1 text-semibold");
    let confirmTextContinue = document.createTextNode("OK")
    buttonContinue.appendChild(confirmTextContinue);
    this.modal._footer.appendChild(buttonContinue);
    buttonContinue.addEventListener("click", this.modal._closeCallback);

    return this.modal.setAttribute("is-open", "true")
  }

  _modalWarningConfirm(message, buttonClose, buttonSave){
    this._modalClear();
    let text = document.createTextNode(" Warning");
    this.modal._titleDiv.innerHTML = "";
    let warningIcon = document.createElement("modal-warning");
    warningIcon.svg.setAttribute("class", "h3 text-yellow");
    this.modal._titleDiv.append( );
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    
    this.modal._footer.appendChild(buttonClose);
    this.modal._footer.appendChild(buttonSave);
    
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
    
    if(scroll) this.modal._main.classList.add("fixed-height-scroll");

    let buttonClose = document.createElement("button")
    buttonClose.setAttribute("class", "btn btn-clear btn-charcoal f1 text-semibold");
    buttonClose.innerHTML = "Cancel";

    buttonClose.addEventListener("click", this.modal._closeCallback);

    this.modal._footer.appendChild(buttonSave);
    this.modal._footer.appendChild(buttonClose);
    return this.modal.setAttribute("is-open", "true");
  }

  _modalComplete(message){
    
    this._modalClear();
    let text = document.createTextNode("Complete");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    this.modal._footer.innerHTML = "";

    let buttonContinue = document.createElement("button");
    buttonContinue.setAttribute("class", "btn f1 text-semibold");
    let confirmTextContinue = document.createTextNode("OK")
    buttonContinue.appendChild(confirmTextContinue);
    this.modal._footer.appendChild(buttonContinue);
    buttonContinue.addEventListener("click", this.modal._closeCallback);

    this.modal.setAttribute("is-open", "true");
    // this.modal.fadeOut();
  }

  _modalClear(){
    if(this.modal._titleDiv) this.modal._titleDiv.innerHTML = "";
    if(this.modal._main) this.modal._main.innerHTML = "";
    if(this.modal._footer) this.modal._footer.innerHTML = "";
    if(this.modal._main) this.modal._main.classList.remove("fixed-height-scroll");
    
    return this.modal;
  }

  _modalCloseCallback(){
    this.modal._closeCallback();
    this._modalClear();
  }


}
