class EntityGalleryLabels extends TatorElement {
    constructor() {
      super();
    
      // Hide panel by default
      this._main = document.createElement("details");
      this._main.setAttribute("class", "entity-gallery-labels px-3 py-2");

      //
      this._title = document.createElement("summary");
      let text = document.createTextNode("Labels")
      this._title.appendChild(text);
      this._main.appendChild(this._title);

      // use input helper
      this.inputHelper = new SettingsInput();

    }

    /*
     * @localization-type - object {type : [@attribute-name, @attribute-name, @attribute-name] ... }
     * @gallery - element
     * 
    */
    async init( {gallery, localizationTypes} ){
      this._gallery = gallery;
      console.log("label init");

      // Stop here if we aren't ok after init
      if (gallery === null || typeof localizationTypes == "undefined") return console.log("Error in label init");;

      // If ok, create the checkbox list for each Localization
      for(let [key, val] of Object.entries(localizationTypes) ) {
          console.log(`Loc att map output key ${key} and val ${val}`);
          let checkboxList = this.makeListFrom(val, key);
          let selectionBox = this.inputHelper.multipleCheckboxes({
            labelText : key,
            name : 'gallery-labels',
            checkboxList
          });

          // Append to main box
          this._main.appendChild(selectionBox)
      }

      let checkboxes = this._shadow.querySelectorAll("input");
      for(let c in checkboxes){
        console.log(c);
          // c.addEventListener("change", () => {
          //   if(c.checked == true){
          //       let showAttr = new  CustomEvent("labels-changed", { detail : { "class" : c.val }})
          //       this._gallery.dispatchEvent(showAttr);
          //   }
          // });
      }

          
      return this._shadow.appendChild(this._main);
    }

    /*
    * Accepts attributes objects with ID, and Name:
    * @id created for checkbox value using attribute name
    * @name used for checkbox label
    * And String for parent name which is the localization name (not type)
    */
    makeListFrom( attributes, parentName ){
        let newList = [];
        console.log(attributes);
        for (attr in attributes){
            let name = attr.name;
            let id = `${encodeURI(parentName)}_${encodeURI(attr.name)}`;
            newList.push({ id, name });
        }
        return newList;
    }
   
  }
  
  customElements.define("entity-gallery-labels", EntityGalleryLabels);  