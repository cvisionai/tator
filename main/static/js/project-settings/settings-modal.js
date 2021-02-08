class SettingsModal extends ModalDialog {
    constructor(){
        super();

        this._closeCallback = evt => {
            //this.shadow.removeAttribute("has-open-modal", "");
            this._div.classList.remove("shortcuts-disabled");
            this.dispatchEvent(new Event("close"));
            this.removeAttribute("is-open");
          };
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
          case "is-open":
            if (newValue === null) {
              document.body.classList.add("shortcuts-disabled");
              //this._div.setAttribute("has-open-modal", "true");
              this._div.classList.remove("is-open");
            } else {
              this._div.classList.add("is-open");
              //this._div.setAttribute("has-open-modal", "");
            }
            break;
    
      }
    }

}

customElements.define("settings-modal", SettingsModal);