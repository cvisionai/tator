class FormWarning extends TatorElement {
    constructor() {
      super();
    }
    
    getWarning(err){
        let warning = this._inlineWarningDiv();
        let thisWarning = _inlineWarning({"el":warning, "message":err})
        return thisWarning;
    }

  hideWarning(warning){
    return warning.remove();
  }

  _inlineWarning({
    el = "",
    message = ""
  }){
    //empty el
    el.innerHTML = "";
    let inlineL= document.createElement("span");
    inlineL.setAttribute("class", "col-4");
    inlineL.innerHTML = "&nbsp;"
    el.appendChild(inlineL);

    let inlineR= document.createElement("span");
    inlineR.setAttribute("class", "col-8");
    inlineR.innerHTML = message;
    el.appendChild(inlineR);

    return el.hidden = false;
  }

  _inlineWarningDiv(){
    let inlineWarning = document.createElement("div");
    inlineWarning.setAttribute("class", "text-red d-flex inline-warning");
    inlineWarning.hidden = true;

    return inlineWarning;
  }
}

customElements.define("form-warning", FormWarning);