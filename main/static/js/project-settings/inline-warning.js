class InlineWarning extends TatorElement {
    constructor() {
      super();
    }

    div(){
      return this._inlineWarningDiv();
    }

    _inlineWarningDiv(){
      // Div
      this.inlineWarning = document.createElement("div");
      this.inlineWarning.setAttribute("class", "text-red d-flex inline-warning");
      this.inlineWarning.hidden = true;
  
      return this.inlineWarning;
    }

  show(msg){
    // Clear whatever was there
    this.inlineWarning.innerHTML = "";

    // Append new msg
    this.inlineWarning.append(msg);

    // Show
    return this.inlineWarning.hidden = false;
  }

  hide(){
    this.inlineWarning.innerHTML = "";
    return this.inlineWarning.hidden = true;
  }


}

customElements.define("inline-warning", InlineWarning);