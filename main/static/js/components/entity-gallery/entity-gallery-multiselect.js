class EntityGalleryMultiselect extends TatorElement {
   constructor() {
      super();

      var userAgent = navigator.userAgent;
      var mobileFirefox = userAgent.indexOf("Firefox") !== -1 && userAgent.indexOf("Mobile") !== -1;
      // 'keyup' event will not be fired on Mobile Firefox, so we have to use 'input' event instead
      var keyUpEventName = mobileFirefox ? "input" : "keyup";

      document.addEventListener("keydown", this.keydownHandler.bind(this));
      document.addEventListener("keyup", this.keyupHandler.bind(this));
      document.addEventListener("click", this.clickListener.bind(this));
      document.addEventListener('contextmenu', this.contextMenuHandler.bind(this));


      document.addEventListener('click', function (e) {
         if (e.ctrlKey) {
           console.log('With ctrl, do something...');
           return;
         }
       });

      // Listen to left and right to see when control is down or up
      this._ctrlDown = false;
   }

   set dataList(val) {
      console.log(val);
   }

   dataHandler() {
      // This will talk with a gallery to make a data list
   }

   keydownHandler(e) {
      console.log(`this._shortcutsDisabled: ${this._shortcutsDisabled}`)
      if (this._shortcutsDisabled) {
        return;
      }

      if (e.key == "Control") {
         this._ctrlDown = true;
      }

   }

   keyupHandler(e) {
      console.log(`this._shortcutsDisabled: ${this._shortcutsDisabled}`)
      if (this._shortcutsDisabled) {
        return;
      }

      if (e.key == "Control") {
         this._ctrlDown = false;
      }
      
   }

   clickListener(e) {
      console.log("Click listener heard this: "+e.target);
      if (e.shiftKey) {
         console.log("test shift click");
         this.dispatchEvent("shift-select"); // we will need to connect the dots
         console.log(e.target);
         console.log(e.target.offset())
         console.log(e.target.position())
      } 
   }

   

}

customElements.define("entity-gallery-multiselect", EntityGalleryMultiselect);