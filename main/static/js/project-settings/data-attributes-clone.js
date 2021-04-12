/* Class with methods return input types with preset values for editing.*/
class AttributesData {
    constructor({projectId, typeName, typeId, inputs}) {
      // Feature-related class(es) to customize form element. Applies to all elements.
      this.projectId = projectId;
      this.typeName = typeName;
      this.typeId = typeId;
      this.inputs = inputs;
      this.inputHelper = new SettingsInput("media-types-main-edit");
      this.responseMessage = "";
    }

    _fetchPostPromise({formData = null } = {}){
        console.log("Attribute (new) Post Fetch");
    
        if(formData != null){
          return fetch("/rest/AttributeType/"+this.typeId, {
            method: "POST",
            mode: "cors",
            credentials: "include",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
          });
        } else {
          console.log("Problem with new attribute form data.");
        }
      }
  
    createClones(){
      //create form data & post promise array for the attribute forms, and submit
      let checkboxes = this.inputs;
      this.successMessages = "";
      this.failedMessages = "";
      let promises  = [];
  
      for(let c of checkboxes){
        let nameOfSaved = "";
        if(c.checked == true){
          nameOfSaved = c.value;
          let cloneValues = JSON.parse(c.dataset.data); //parse data attribute

          console.log("cloneValues");
          console.log(cloneValues);

          this.attributeForm = new AttributesForm();
          this.attributeForm._getFormWithValues({clone : true, ...cloneValues});
          let formJSON = {
            "entity_type": this.typeName,
            "addition": this.attributeForm._getAttributeFormData()
          };
          //let status = "";
  
          let promise = this._fetchPostPromise({
            "formData" : formJSON
          });

          promises.push(promise);
        }

      }

      return Promise.all(promises).then( async( respArray ) => {
        //console.log(respArray);
        let responses = [];
        respArray.forEach((item, i) => {
          responses.push( item.json() )
        });
          
        return Promise.all( responses )
          .then ( dataArray => {
            for(let o in dataArray) {
              let status = respArray[o].status;
              let data = dataArray[o];

              let currentMessage = data.message;
              let succussIcon = document.createElement("modal-success");
              let warningIcon = document.createElement("modal-warning");
              let iconWrap = document.createElement("span");
      
              console.log("Clone status "+ status);
              
              if(status == 201){
                iconWrap.appendChild(succussIcon);
                this.successMessages += `${iconWrap.innerHTML} ${currentMessage}<br/><br/>`;
              }
      
              if(status == 400){
                iconWrap.appendChild(warningIcon);
                this.failedMessages += `${iconWrap.innerHTML} ${currentMessage}<br/><br/>`;
              }
            }
            this.responseMessage += this.successMessages+this.failedMessages;
            //console.log(this.responseMessage);

            return this.responseMessage
          });
          
        });
    }
  
}
  