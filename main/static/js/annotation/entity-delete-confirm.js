class EntityDeleteConfirm extends ModalDialog {
   constructor() {
     super();
 
     const icon = document.createElement("modal-warning");
     this._header.insertBefore(icon, this._titleDiv);
 
     const warning = document.createElement("p");
     warning.setAttribute("class", "text-gray f1");
     warning.innerText = "Check 'Remember preference' to allow deletion without confirmation for this annotation type, and media for this session.";
     this._main.appendChild(warning);

     const alwaysAllowP = document.createElement("p");
     alwaysAllowP.setAttribute("class", "py-3 f1");
     this._main.appendChild(alwaysAllowP);

     this._alwaysAllow = document.createElement("checkbox-input");
     this._alwaysAllow.default = "off";
     this._alwaysAllow.setAttribute("name", "Remember preference");
     alwaysAllowP.appendChild(this._alwaysAllow);

    //  const alwaysAllowText = document.createTextNode("Check to always allow delete during this session.");
    //  alwaysAllowP.appendChild(alwaysAllowText);
 
     this._accept = document.createElement("button");
     this._accept.setAttribute("class", "btn btn-clear btn-red");
     this._accept.textContent = "Delete";
     this._footer.appendChild(this._accept);
     
     const cancel = document.createElement("button");
     cancel.setAttribute("class", "btn btn-clear btn-charcoal");
     cancel.textContent = "Cancel";
     this._footer.appendChild(cancel);
 
     cancel.addEventListener("click", this._closeCallback);
 
     this._title.nodeValue = "Delete Localization?";
 
     this._accept.addEventListener("click", async evt => {
       console.log("always allow value " + this._alwaysAllow.getValue());
       // when they accept only, save their preference to storage
      if (this._alwaysAllow.getValue() == "on") {
        sessionStorage.setItem('allowSessionDelete', 'true');
      }
      this._closeCallback();
      this.dispatchEvent(new Event("confirmDelete")); 
     });

     this.addEventListener("open", () => {
       const isOpenObj = JSON.parse(this.getAttribute('is-open'));
       console.log(isOpenObj);
       console.log("Checking session var... allowSessionDelete: " + sessionStorage.getItem('allowSessionDelete'));
       if (typeof sessionStorage.getItem('allowSessionDelete') !== "undefined" && sessionStorage.getItem('allowSessionDelete') == "true") {
        this._closeCallback();
        this.dispatchEvent(new Event("confirmDelete"));
       }
     })
   }

 }
 
 customElements.define("entity-delete-confirm", EntityDeleteConfirm);
 