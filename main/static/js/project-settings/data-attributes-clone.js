/* Class with methods return input types with preset values for editing.*/
class AttributesData {
    constructor({projectId, typeName, typeId, selectedData}) {
      // Feature-related class(es) to customize form element. Applies to all elements.
      this.projectId = projectId;
      this.typeName = typeName;
      this.typeId = typeId;
      this.selectedData = selectedData;

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
      this.successMessages = "";
      this.failedMessages = "";
      let promises  = [];
  
      for(let data of this.selectedData){
        let cloneValue = JSON.parse(data); //parse data attribute

        console.log("cloneValue");
        console.log(cloneValue);

        this.attributeForm = new AttributesForm();
        this.attributeForm._getFormWithValues({clone : true, ...cloneValue});
        let formJSON = {
          "entity_type": this.typeName,
          "addition": this.attributeForm._getAttributeFormData()
        };

        let promise = this._fetchPostPromise({
          "formData" : formJSON
        });

        promises.push(promise);
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
              
              if(respArray[o].ok){
                iconWrap.appendChild(succussIcon);
                this.successMessages += `${iconWrap.innerHTML} ${currentMessage}<br/><br/>`;
              } else {
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
  