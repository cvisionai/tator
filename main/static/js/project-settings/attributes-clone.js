/* Class with methods return input types with preset values for editing.*/
class AttributesClone {
  constructor(projectId, fromType, fromId, modal) {
    // Feature-related class(es) to customize form element. Applies to all elements.
    this.projectId = projectId;
    this.fromType = fromType;
    this.fromId = fromId;
    this.attributeFormHelper = new AttributesForm();
    this.inputHelper = new SettingsInput("media-types-main-edit");
    this.modal = modal;
  }

  // Checks for stored attributes obj in localstorage
  // If there isn't one - it creates it for this project
  _init(){
    this._getProjectAttrList(this.projectId );

    return this._getDuplicateAttributesForm();
  }

  _getDuplicateAttributesForm(){
    const form = document.createElement("form");
    this.form = form;

    this.form.addEventListener("change", (event) => {
      console.log("Clone attribute form changed");
      this.form.classList.add("changed");
    });

    const typeOptions = this._getTypesList();

    // Fields for this form
    const TYPE = "Type";
    this.selectBox = this.inputHelper.inputSelectOptions({
      "labelText": TYPE,
      "value": "Select",
      "optionsList": typeOptions,
      "name" : TYPE.toLowerCase()
    });
    this.form.appendChild(this.selectBox);

    this.selectBox.addEventListener("change", (event) => {
      let value = "";

      for(let i of event.target.options){
        console.log(i);
        if(i.selected == true) {
          value = i.value;
          console.log("i.value: "+i.value);
          console.log(i.innerHTML);
        }
      }

      let entitySelect = this._getEntitiesForType( value );
      this.placeholderEntities.innerHTML = ""; //empty any current value
      this.placeholderAttributes.innerHTML = ""; //empty any current value
      this.checkedRadio = []; //removed remembered check
      console.log(entitySelect);
      this.placeholderEntities.appendChild(entitySelect);

      entitySelect.addEventListener("change", (event) => {
        let checkboxHTML = this._getAttributeCheckboxes(event);
        this.placeholderAttributes.innerHTML = ""; //empty any current value
        this.placeholderAttributes.appendChild(checkboxHTML);
      });
    });

    this.placeholderEntities = document.createElement("div");
    this.placeholderEntities.setAttribute("class", "placeholderEntities");
    this.form.appendChild(this.placeholderEntities);

    this.placeholderAttributes = document.createElement("div");
    this.placeholderAttributes.setAttribute("class", "placeholderAttributes");
    this.form.appendChild(this.placeholderAttributes);

    this.submitForm = this.inputHelper.saveButton();
    this.form.appendChild(this.submitForm);

    this.submitForm.addEventListener("click", (event) => {
      event.preventDefault();
      this.createClones();
    });

    return this.form;
  }

  createClones(){
    //create form data & post promise array for the attribute forms, and submit
    let checkboxes = this.placeholderAttributes.getElementsByTagName("input");
    let attrDataArray = [];
    this.messages = "";
    this.modal._closeCallback();

    for(let c of checkboxes){
      let nameOfSaved = "";
      if(c.checked == true){
        nameOfSaved = c.value;
        console.log("Cloning: "+nameOfSaved);
        console.log(c.dataset.data);
        let cloneValues = JSON.parse(c.dataset.data); //parse data attribute
        let clonedForm = this.attributeFormHelper._getFormWithValues(cloneValues);
        let formJSON = {
          "entity_type": this.fromType,
          "addition": this.attributeFormHelper._getAttributeFormData(clonedForm)
        };

        console.log(formJSON);

        this._fetchPostPromise({
          "formData" : formJSON
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            this.messages += data.message+"<br/><br/>";
            console.log("attribute saved! [[placeholder]]");

            this._modalComplete(this.messages);

          });


      }

    }
  }

  _fetchPostPromise({formData = null } = {}){
    console.log("Attribute (new) Post Fetch");

    if(formData != null){
      return fetch("/rest/AttributeType/"+this.fromId, {
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

  _getAttributeCheckboxes(event){
    let value = ""
    for(let i of event.target.options){
      if(i.selected == true) {
        value = i.value;
        console.log("_getAttributeCheckboxes selected entity: " + i.value);
      }
    }

    // make a new list
    let list = this.entities[value];
    let newList = [];
    for(let a of list){
      let entity = {}
      entity.name = a.name; // checkbox label
      entity.id = a.name; // checkbox value
      entity.data = JSON.stringify(a); // checkbox hidden data
      newList.push(entity);
    }

    let attributeCheckboxes = this.inputHelper.multipleCheckboxes({
      "value" : '',
      "labelText" : 'Attribute(s)',
      "name" : 'attribute-clones',
      "checkboxList" : newList
    });

    return attributeCheckboxes;
  }

  // Choose a type and entity to see a list of attributes:
  _getTypesList(){
      return [
        {"optText": "Select type", "optValue":""},
        {"optText": "Media Type", "optValue":"mediatypes"},
        {"optText": "Localization Type", "optValue":"localization"},
        {"optText": "State Type", "optValue":"state"},
        {"optText": "Leaf Type", "optValue":"leaf"},
      ];
  }

  _getProjectAttrList(projectId = this.projectId){
    console.log("getting all types / entity / attr associations from local storage");
    let key = "project-types-atrr-list_"+projectId;
    //this.projectAttrList = window.localStorage.getItem(key);

    //console.log("what's the current local storage value?");
    //console.log(this.projectAttrList);

    //if(this.projectAttrList != null && this.projectAttrList.length > 0){
    //  this.projectAttrList = JSON.parse(this.projectAttrList);
    //} else {
      this.projectAttrList = this._setProjectAttrList(projectId, key);

    //}

    console.log("at the end of GET list....");
    console.log(this.projectAttrList);

    return this.projectAttrList;
  }

  _setProjectAttrList(projectId = this.projectId, key){
    console.log("settting all types / entity / attr associations from local storage");
    // Promise all.... then bundle them up
    let promises = this._getAllTypePromises(projectId);

    this.projectAttrList = {};

    Promise.all(promises)
    .then( async([mta, lo, le, st]) => {
      const mediaTypesData = mta.json();
      const localizationData = lo.json();
      const leafTypeData = le.json();
      const stateTypeData = st.json();
      Promise.all( [mediaTypesData, localizationData, leafTypeData, stateTypeData] )
        .then( ([mediaTypes, localization, leaf, state]) => {
          this.projectAttrList.mediatypes = {};
          this.projectAttrList.localization = {};
          this.projectAttrList.leaf = {};
          this.projectAttrList.state = {};

          for(let entity of mediaTypes){
              this.projectAttrList.mediatypes[entity.name] = entity.attribute_types;
          }
          for(let entity of localization){
              this.projectAttrList.localization[entity.name] = entity.attribute_types;
          }
          for(let entity of leaf){
              this.projectAttrList.leaf[entity.name] = entity.attribute_types;
          }
          for(let entity of state){
              this.projectAttrList.state[entity.name] = entity.attribute_types;
          }

          window.localStorage.setItem(key, JSON.stringify(this.projectAttrList));

        })
        // TMP commented out to see the file and line number of error
        //.catch(err => {
          //this._shadow.querySelector('.loading').remove();
        //  console.error("File "+ err.fileName + " Line "+ err.lineNumber +"\n" + err);
        //})
      });

    return this.projectAttrList;
  }

  _getEntitiesForType(type){
    console.log(type);
    type = type.replace(/[^\w]|_/g, "").toLowerCase();
    console.log("_getEntitiesForType((()))"+type);
    console.log(this.projectAttrList[type]);

    this.entities = this.projectAttrList[type];

    let entityOptions = [{"optText":"Select", "optValue": ""}];

    for(let o in this.entities){
      console.log(o);
      let option = {"optText":o, "optValue":o};
      entityOptions.push(option)
    }

    let selectBox = this.inputHelper.inputSelectOptions({
      "labelText": "Entity",
      "value": "",
      "optionsList": entityOptions,
      "name" : "entity"
    });

    return selectBox;
  }

  _getAllTypePromises(projectId = this.projectId){
    // Media Type section.
    this.mediaTypesBlock = document.createElement("media-type-main-edit");
    this.localizationBlock = document.createElement("localization-edit");
    this.leafTypesBlock = document.createElement("leaf-type-edit");
    this.stateTypesBlock = document.createElement("state-type-edit");

    const mediaTypesPromise = this.mediaTypesBlock._fetchGetPromise({"id": this.projectId} );
    const localizationsPromise = this.localizationBlock._fetchGetPromise({"id": this.projectId} );
    const leafTypesPromise = this.leafTypesBlock._fetchGetPromise({"id": this.projectId} );
    const stateTypesPromise = this.stateTypesBlock._fetchGetPromise({"id": this.projectId} );

    return [
      mediaTypesPromise,
      localizationsPromise,
      leafTypesPromise,
      stateTypesPromise
    ];
  }

  _modalComplete(message){
    let text = document.createTextNode("Complete");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    this.modal._main.classList.remove("fixed-heigh-scroll");

    return this.modal.setAttribute("is-open", "true")
  }
}
