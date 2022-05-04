import { TatorElement } from "../../components/tator-element.js";
import { getCookie } from "../../util/get-cookie.js";
import { Utilities } from "../../util/utilities.js";
import { LoadingSpinner } from "../../components/loading-spinner.js";
import { SettingsBox } from "../settings-box-helpers.js";
import { TypeNew } from "./type-new.js";
import { TypeDelete } from "./type-delete.js";

export class TypeForm extends TatorElement {
  constructor() {
    super();

    // Correct name for the type, ie. "LocalizationType"
    this.typeName = "";
    this.readableTypeName = "";

    // Main Div wrapper
    this._formContainer = document.createElement("div");
    this._formContainer.setAttribute("class", "d-flex flex-row");
    this._shadow.appendChild(this._formContainer);

    // Main Div
    this.typeFormDiv = document.createElement("div");
    this.typeFormDiv.setAttribute("class", "pl-md-6 col-12 px-6")
    this._formContainer.appendChild(this.typeFormDiv);

    // Attribute Container
    this._attributeContainer = document.createElement("div");
    this._attributeContainer.setAttribute("class", "col-4");
    this._attributeContainer.hidden = true; // not alway in use
    this._formContainer.appendChild(this._attributeContainer);

    // Loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg());

    // Init hide attributes
    this._hideAttributes = false;

    // Init button early
    this.saveButton = document.createElement("input");
    this.savePost = document.createElement("button");
  }

  _init({ data, modal, sidenav, versionListHandler, mediaListHandler, clusterListHandler, isStaff }) {
    // Log to verify init
    // console.log(`${this.readableTypeName} init.`);
    // console.log(data);

    // Initial values
    this.data = data;
    this.modal = modal;
    this.projectId = this.data.project;
    this.typeId = this.data.id
    this.sideNav = sidenav;
    this.versionListHandler = versionListHandler;
    this.mediaListHandler = mediaListHandler;
    this.clusterListHandler = clusterListHandler;
    this.isStaff = isStaff;

    // Pass modal to helper
    this.boxHelper = new SettingsBox(this.modal);

    // Add form to page
    this.setupFormPage(data)
  }

  async setupFormPage(data = this.data, isReset = false) {
    if (!isReset) {
      // New heading element.
      this.h1 = document.createElement("h1");
      this.h1.setAttribute("class", "h3 pb-3 edit-project__h1");
      this.typeFormDiv.appendChild(this.h1);
    } else {
      this.h1.innerHTML = "";
    }

    // Create a form with values, or empty editable form
    if (!this.data.form && !this.data.form != "empty") {
      if (this.typeName == "Membership") {
        this.h1_name = document.createTextNode(`${this.data.username} `);
      } else {
        this.h1_name = document.createTextNode(`${this.data.name} `);
      }
      this.h1.appendChild(this.h1_name);

      this.separate_span = document.createElement("span");
      this.separate_span.setAttribute("class", "px-2");
      this.h1.appendChild(this.separate_span);
      const h1_separate_span = document.createTextNode(`|`);
      this.separate_span.appendChild(h1_separate_span);

      this.type_span = document.createElement("span");
      this.type_span.setAttribute("class", "text-gray text-normal");
      this.h1.appendChild(this.type_span);
      const h1_type = document.createTextNode(` ${this.typeName}`);
      this.type_span.appendChild(h1_type);

      this.id_span = document.createElement("span");
      this.id_span.setAttribute("class", "text-gray text-normal");
      this.h1.appendChild(this.id_span);
      const h1_id = document.createTextNode(` (ID ${this.data.id})`);
      this.id_span.appendChild(h1_id);


      // Add form element to page
      if (!isReset) {
        // New form wrapper element.
        this._formWrapper = document.createElement("div");
        this.typeFormDiv.appendChild(this._formWrapper);
      } else {
        this._formWrapper.innerHTML = "";
      }
      const sectionForm = await this._getSectionForm(this.data);
      this._formWrapper.appendChild(sectionForm);

      // attribute section
      if (typeof this._hideAttributes !== "undefined" && this._hideAttributes == false) {
        this.typeFormDiv.setAttribute("class", "pl-md-6 col-8 px-6")
        this._attributeContainer.hidden = false;
        if (isReset) this._attributeContainer.innerHTML = "";
        this._attributeContainer.appendChild(this._getAttributeSection());
      }

      // append save button
      if (!isReset) {
        const submitNew = this._getSubmitDiv({ "id": this.data.id });
        this.typeFormDiv.appendChild(submitNew);
      }

      // delete section
      if (!isReset) {
        this.typeFormDiv.appendChild(this.deleteTypeSection());
      }

      return this.typeFormDiv;
    } else {
      // Update heading
      const t = document.createTextNode(`Add new ${this.readableTypeName}.`);
      this.h1.appendChild(t);
            
      // Add form element to page
      if (!isReset) {
        // New form wrapper element.
        this._formWrapper = document.createElement("div");
        this.typeFormDiv.appendChild(this._formWrapper);
      } else {
        this._formWrapper.innerHTML = "";
      }
      if (typeof this.mediaListHandler !== "undefined") {
        await this.mediaListHandler.getProjectMediaList(true);
      }
      const emptyData = this._getEmptyData();
      const sectionForm = await this._getSectionForm(emptyData);
      this._formWrapper.appendChild(sectionForm);
      
      // Add save button
      if (!isReset) {
        const submitNew = this._getSubmitNewDiv({ "id": this.data.id });
        this.typeFormDiv.appendChild(submitNew);
      }
   

      return this.typeFormDiv;
    }
  }

  _getSubmitNewDiv() {
    let text = document.createTextNode("Save");

    this.savePost.appendChild(text);
    this.savePost.setAttribute("value", "Save");
    this.savePost.setAttribute("class", `btn btn-clear text-center f1 text-semibold`);
    this.savePost.style.margin = "0 auto";
    this.savePost.addEventListener("click", this._savePost.bind(this));

    return this.savePost;
  }

  _savePost() {
    this.loading.showSpinner();
    let addNew = new TypeNew({
      "type": this.typeName,
      "projectId": this.projectId
    });

    let formData = this._getFormData();

    addNew.saveFetch(formData).then(([data, status]) => {
      this.loading.hideSpinner();
      // console.log(status);
      if (status == 201 || status == 200) {
        // Hide the add new form
        this.sideNav.hide(`itemDivId-${this.typeName}-New`);
        // console.log("Resetting new form after save....");
        this.reset();

        // Create and show the container with new type
        this.sideNav.addItemContainer({
          "type": this.typeName,
          "id": data.id,
          "hidden": false
        });

        let form = document.createElement(this._getTypeClass());

        this.sideNav.fillContainer({
          "type": this.typeName,
          "id": data.id,
          "itemContents": form
        });

        const saveMessage = data.message;
        const saveReturnId = data.id;
        form.typeId = saveReturnId;

        // init form with the data
        this._fetchByIdPromise({ id: saveReturnId }).then(resp => resp.json()).then(data => {
          // console.log(data);
          form._init({
            data,
            modal: this.modal,
            sidenav: this.sideNav,
            mediaListHandler: this.mediaListHandler,
            versionListHandler: this.versionListHandler,
            clusterListHandler: this.clusterListHandler,
            isStaff: this.isStaff
          });

          // Add the item to navigation
          this._updateNavEvent("new", data.name, saveReturnId);
        });
        // Let user know everything's all set!
        return this._modalSuccess(saveMessage);

      } else {
        return this._modalError(data.message);
      }


    }).catch((err) => {
      console.error(err);
      this.loading.hideSpinner();
      return this._modalError("Error adding new type.");
    });
  }

  _getTypeClass() {
    switch (this.typeName) {
      case "MediaType":
        return "media-type-main-edit";
      case "LocalizationType":
        return "localization-edit";
      case "LeafType":
        return "leaf-type-edit";
      case "StateType":
        return "state-type-edit";
      case "Project":
        return "project-main-edit";
      case "Membership":
        return "membership-edit";
      case "Version":
        return "versions-edit";
      case "Algorithm":
        return "algorithm-edit";
      case "Applet":
        return "applet-edit";
        
      default:
        break;
    }
  }

  //
  _getSubmitDiv({ id = -1 } = {}) {
    const submitDiv = document.createElement("div");
    submitDiv.setAttribute("class", "d-flex flex-items-center flex-justify-center py-3");

    // Save button and reset link
    submitDiv.appendChild(this._saveEntityButton(id));
    submitDiv.appendChild(this._resetEntityLink(id));

    return submitDiv;
  }

  _getAttributeSection() {
    this.attributeSection = document.createElement("attributes-main");
    this.attributeSection.setAttribute("data-from-id", `${this.typeId}`)
    this.attributeSection._init(this.typeName, this.typeId, this.data.name, this.projectId, this.data.attribute_types, this.modal);

    // Register the update event - If attribute list name changes, or it is to be added/deleted listeners refresh data
    this.attributeSection.addEventListener('settings-refresh', this._attRefreshListener.bind(this));

    return this.attributeSection;
  }

  _attRefreshListener(e) {
    return this.resetHard();
  }

  _saveEntityButton(id) {
    this.saveButton.setAttribute("type", "submit");
    this.saveButton.setAttribute("value", "Save");
    this.saveButton.setAttribute("class", `btn btn-clear f1 text-semibold`);


    if (!this.saveButton.disabled) {
      this.saveButton.addEventListener("click", (event) => {
        this.saveButton.disabled = true;
        this.saveButton.classList.add("disabled");
        event.preventDefault();
        if (this.isChanged()) {
          // console.log("Save for id: " + id);
          this._save({ "id": id }).then(() => {
            this.saveButton.disabled = false;
            this.saveButton.classList.remove("disabled");
          })
        } else {
          // @TODO- UX Save button disabled until form change
          let happyMsg = "Nothing new to save!";
          this._modalSuccess(happyMsg);
        }
      });
    }

    return this.saveButton;
  }

  _resetEntityLink(id) {
    this.resetLink = document.createElement("a");
    this.resetLink.setAttribute("href", "#");
    this.resetLink.setAttribute("class", `px-5 f1 text-gray hover-text-white`);

    let resetLinkText = document.createTextNode("Reset");
    this.resetLink.appendChild(resetLinkText);

    // Form reset event
    this.resetLink.addEventListener("click", (event) => {
      event.preventDefault();
      this.reset(id)
      console.log("Reset complete.");
    });
    return this.resetLink;
  }

  // form with parts put together
  _setForm() {
    this._form = document.createElement("form");
    this._form.id = this.typeId;

    //this._form.addEventListener("change", this._formChanged.bind(this));

    return this._form;
  }

  _getHeading() {
    let headingSpan = document.createElement("span");
    let labelSpan = document.createElement("span");
    labelSpan.setAttribute("class", "item-label");
    let t = document.createTextNode(`${this.readableTypeName}s`);
    labelSpan.appendChild(t);
    headingSpan.innerHTML = this.icon;
    headingSpan.appendChild(labelSpan);

    return headingSpan;
  }

  deleteTypeSection() {
    let button = document.createElement("button");
    button.setAttribute("class", "btn btn-small btn-charcoal float-right btn-outline text-gray");
    button.style.marginRight = "10px";

    let deleteText = document.createTextNode(`Delete`);
    button.appendChild(deleteText);

    let descriptionText = `Delete this ${this.readableTypeName} and all its data?`;
    let headingDiv = document.createElement("div");
    headingDiv.setAttribute("class", "clearfix py-6");

    let heading = document.createElement("div");
    heading.setAttribute("class", "py-md-5 float-left col-md-5 col-sm-5 text-right");

    heading.appendChild(button);

    let description = document.createElement("div");
    let _descriptionText = document.createTextNode("");
    _descriptionText.nodeValue = descriptionText;
    description.setAttribute("class", "py-md-6 f1 text-gray float-left col-md-7 col-sm-7");
    description.appendChild(_descriptionText);

    headingDiv.appendChild(heading);
    headingDiv.appendChild(description);

    this.deleteBox = this.boxHelper.boxWrapDelete({
      "children": headingDiv
    });

    this.deleteBox.style.backgroundColor = "transparent";

    button.addEventListener("click", this._deleteTypeConfirm.bind(this))

    return this.deleteBox;
  }

  _deleteTypeConfirm() {
    let button = document.createElement("button");
    let confirmText = document.createTextNode("Confirm")
    button.appendChild(confirmText);
    button.setAttribute("class", "btn btn-clear f1 text-semibold btn-red")

    button.addEventListener("click", this._deleteType.bind(this));

    this._modalConfirm({
      "titleText": `Delete Confirmation`,
      "mainText": `Pressing confirm will delete this ${this.typeName} and all its data from your account. Do you want to continue?`,
      "buttonSave": button,
      "scroll": false
    });
  }

  _deleteType() {
    this._modalCloseCallback();
    this.loading.showSpinner();

    let deleteType = new TypeDelete({
      "type": this.typeName,
      "typeId": this.typeId
    });

    if (this.typeId != "undefined") {
      deleteType.deleteFetch().then((data) => {
        this._updateNavEvent("remove");
        this.loading.hideSpinner();
        return this._modalComplete(data.message);
      }).catch((err) => {
        console.error(err);
        this.loading.hideSpinner();
        return this._modalError("Error with delete.");
      });
    } else {
      console.error("Type Id is not defined.");
      this.loading.hideSpinner();
      return this._modalError("Error with delete.");
    }

  }

  _getEmptyData() {

    return {
      id: `New`,
      name: "",
      project: this.projectId,
      description: "",
      visible: false,
      grouping_default: false,
      media: [],
      dtype: "",
      colorMap: null,
      interpolation: "none",
      association: "Media",
      line_width: 2,
      delete_child_localizations: false,
      cluster: null,
      manifest: null,
      files_per_job: null,
      parameters: [],
      categories: "",
      form: "empty"
    };
  }


  // FETCH FROM MODEL PROMISE STRUCTURE
  // GET ALL {typeName}
  _fetchGetPromise({ id = this.projectId } = {}) {
    return fetch(`/rest/${this.typeName}s/${id}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  // GET {typeName} {ID}
  _fetchByIdPromise({ id = this.typeId } = {}) {
    return fetch(`/rest/${this.typeName}/${id}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  // PATCH
  _fetchPatchPromise({ id = -1, formData } = {}) {
    return fetch(`/rest/${this.typeName}/${id}`, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });
  }

  async _save({ id = -1 } = {}) {
    this.loading.showSpinner();

    //create form data & post promise array for the attribute forms, and submit
    this.successMessages = "";
    this.failedMessages = "";
    this.confirmMessages = "";
    this.saveModalMessage = "";

    this.nameChanged = false;
    this.newName = null;
    this.requiresConfirmation = false;
    // this.hasAttributeChanges = this.attributeSection && this.attributeSection.hasChanges ? true : false;

    if (this.isChanged() ) {
      try {
        if (this.isChanged()) {
          // Main type form
          return this._typeFormChanged();
        }
      } catch (err) {
        console.error("Error saving.", err);
        this.loading.hideSpinner();
        return this._modalError("Error saving type form changes.\nError: " + err);
      }

      try {
        // Compiled messages from above
        await this._showSaveCompletModal();

        // Clean up..................
        // Reset changed flags
        this.changed = false;

        // Update related items with an event if required
        if (this.nameChanged) {
          this._updateNavEvent("rename", this.newName)
        }
      } catch (err) {
        console.error("Error saving.", err);
        this.loading.hideSpinner();
        return this._modalError("Error saving.\nError: " + err);
      }
    } else {
      this.loading.hideSpinner();
      return this._modalSuccess("Nothing new to save!");
    }
  }

  async _showSaveCompletModal() {
    this.saveModalMessage = "";

    if (this.successMessages) {
      let heading = `<div class=" pt-4 h3 pt-4">Success</div>`;
      this.saveModalMessage += heading + this.successMessages;
    }
    if (this.failedMessages) {
      let heading_1 = `<div class=" pt-4 h3 pt-4">Error</div>`;
      this.saveModalMessage += heading_1 + this.failedMessages;
    }
    let mainText = `${this.saveModalMessage}`;
    this._modalComplete(
      mainText
    );
    
    await this.resetHard();

    return this.loading.hideSpinner();
  }

  _typeFormChanged({ id = this.typeId } = {}) {
    const formData = this._getFormData();
    let promise = Promise.resolve();

    if (Object.entries(formData).length === 0) {
      this.loading.hideSpinner();
      return console.error("No formData");
    } else {
      return promise.then(() => {
        if (typeof formData.name !== "undefined") {
          this.nameChanged = true;
          this.newName = formData.name;
        }
        return this._fetchPatchPromise({ id, formData });
      })
        .then(response => response.json().then(data => ({ response: response, data: data })))
        .then(obj => {
          this.loading.hideSpinner();
          let currentMessage = obj.data.message;

          if (obj.response.ok) {
            this._modalSuccess(currentMessage);
          } else {
            this._modalError(currentMessage);
          }
        });
    }
  }

  /**
   * @param {boolean} val
   */
  set changed(val) {
    // console.log(`Changed val set to ${val}`);
    return this._changed = val;
  }

  isChanged() {
    // console.log(`Checking is this._changed.... ${this._changed}`);
    return this._changed;
  }

  _formChanged(event) {
    // console.log(`Changed: ${event.target.tagName}`);
    return this.changed = true;
  }

  _toggleChevron(e) {
    var el = e.target;
    return el.classList.toggle('chevron-trigger-90');
  }

  _toggleAttributes(e) {
    let el = e.target.parentNode.nextSibling;
    let hidden = el.hidden

    return el.hidden = !hidden;
  };

  // RESET FUNCTIONS
  reset(data = this.data) {
    return this.setupFormPage(data, true); // flag isReset=true
  }

  async resetHard() {
    console.log("Hard reset...");
    this.loading.showSpinner();
    this.successMessages = "";
    this.failedMessages = "";
    this.confirmMessages = "";
    this.saveModalMessage = "";
    //Utilities.warningAlert("Refreshing data", "#fff", false);
    //const response = await this._fetchGetPromise();
    const response = await this._fetchByIdPromise();
    // const data = await response.json();
    // this.data = this._findDataById(data);
    //Utilities.hideAlert();
    this.data = await response.json();
    this.loading.hideSpinner();

    this.reset(this.data);

    // console.log(this.data);

    // Update media list in the background
    // In future could send individual media update if fn there to receive it
    if (this.typeName == "MediaType") {
      this.mediaListHandler._clear();
      this.mediaListHandler._setProjectMediaList("", true);
    }
    if (this.typeName == "Version") {
      this.versionListHandler._clear();
      this.versionListHandler._setVersionList("", true);
    }
  }

  _findDataById(allData) {
    for (let x of allData) {
      if (x.id == this.typeId) return x;
    }
    return false;
  }

  // MODAL
  _modalSuccess(message) {
    this._modalClear();
    let text = document.createTextNode(" Success");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append(document.createElement("modal-success"));
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    //this.modal._main.classList.add("fixed-height-scroll");

    return this.modal.setAttribute("is-open", "true")
  }

  _modalError(message) {
    this._modalClear();
    let text = document.createTextNode(" Error");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append(document.createElement("modal-warning"));
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    return this.modal.setAttribute("is-open", "true")
  }

  _modalConfirm({
    titleText = "",
    mainText = "",
    buttonSave = document.createElement("button"),
    scroll = true
  } = {}) {
    this._modalClear();
    this.modal._titleDiv.innerHTML = titleText;

    if (mainText.nodeType == Node.ELEMENT_NODE) {
      this.modal._main.appendChild(mainText);
    } else {
      this.modal._main.innerHTML = mainText;
    }

    if (scroll) this.modal._main.classList.add("fixed-height-scroll");

    let buttonClose = document.createElement("button")
    buttonClose.setAttribute("class", "btn btn-clear f1 text-semibold btn-charcoal");
    buttonClose.innerHTML = "Cancel";

    buttonClose.addEventListener("click", this.modal._closeCallback);

    this.modal._footer.appendChild(buttonSave);
    this.modal._footer.appendChild(buttonClose);
    return this.modal.setAttribute("is-open", "true");
  }

  _modalComplete(message) {
    this._modalClear();
    let text = document.createTextNode("Complete");
    this.modal._titleDiv.innerHTML = "";
    this.modal._titleDiv.append(text);
    this.modal._main.innerHTML = message;
    this.modal._footer.innerHTML = "";
    this.modal._main.classList.remove("fixed-height-scroll");

    return this.modal.setAttribute("is-open", "true");
  }

  _modalClear() {
    this.modal._titleDiv.innerHTML = "";
    this.modal._main.innerHTML = "";
    this.modal._footer.innerHTML = "";

    return this.modal;
  }

  _modalCloseCallback() {
    return this.modal._closeCallback();
  }

  // Update the navigation
  _updateNavEvent(whatChanged, newName = "", newId = -1) {
    const updateTypeId = newId !== -1 ? newId : this.typeId;
    if (whatChanged == "remove") {
      let event = this.sideNav.removeItemEvent(this.typeId, this.typeName);
      this.sideNav.dispatchEvent(event);


      // If this item is a MEDIA or VERSION
      // Then remove the related media list inputs
      if (this.typeName == "MediaType") {
        const deleteEvt = new CustomEvent("change", { detail: { changed: "remove", typeId: updateTypeId } });
        this.mediaListHandler.el.dispatchEvent(deleteEvt);
      } else if (this.typeName == "Version") {
        const deleteEvt = new CustomEvent("change", { detail: { changed: "remove", typeId: updateTypeId } });
        this.versionListHandler.el.dispatchEvent(deleteEvt);
      }

    } else if (whatChanged == "rename") {
      // console.log("Rename event");

      // Renames the item in the side navigation
      let event = this.sideNav.renameItemEvent(updateTypeId, this.typeName, newName);
      this.sideNav.dispatchEvent(event);

      // If this item is a MEDIA or VERSION
      // Then update the related media list inputs
      if (this.typeName == "MediaType") {
        const renameEvt = new CustomEvent("change", { detail: { changed: "rename", typeId: updateTypeId, newName } });
        this.mediaListHandler.el.dispatchEvent(renameEvt);
      } else if (this.typeName == "Version") {
        const renameEvt = new CustomEvent("change", { detail: { changed: "rename", typeId: updateTypeId, newName } });
        this.versionListHandler.el.dispatchEvent(renameEvt);
      }

    } else if (whatChanged == "new") {
      let event = this.sideNav.newItemEvent(newId, this.typeName, newName);
      this.sideNav.dispatchEvent(event);

      // If this item is a MEDIA or VERSION
      // Then update the related media list inputs
      if (this.typeName == "MediaType") {
        const evt = new CustomEvent("change", { detail: { changed: "new", typeId: updateTypeId, newName } });
        this.mediaListHandler.el.dispatchEvent(evt);
      } else if (this.typeName == "Version") {
        const evt = new CustomEvent("change", { detail: { changed: "new", typeId: updateTypeId, newName } });
        this.versionListHandler.el.dispatchEvent(evt);
      }
    } else {
      // console.log("Need more information to update the sidenav.");
    }
  }

  updateMediaList(detail) {
    //Look for the input and remove specific checkbox, or rename the label
    if (typeof this._mediaCheckboxes !== "undefined") {
      if (detail.changed == "rename") {
        this._mediaCheckboxes.relabelInput({
          value: detail.typeId,
          newLabel: detail.newName
        });
      } else if (detail.changed == "remove") {
        this._mediaCheckboxes.removeInput({
          value: detail.typeId
        });
      } else if (detail.changed == "new") {
        let item = {
          id: detail.typeId,
          name: detail.newName
        };

        this._mediaCheckboxes._newInput(item);
      }

    }
  }

  updateVersionList(detail) {
    //Look for the input and remove specific checkbox, or rename the label   
    if (typeof this._basesCheckbox !== "undefined") {
      if (detail.changed == "rename") {
        // console.log("Heard rename")
        this._basesCheckbox.relabelInput({
          value: detail.typeId,
          newLabel: detail.newName
        });
      } else if (detail.changed == "remove") {
        this._basesCheckbox.removeInput({
          value: detail.typeId
        });
      } else if (detail.changed == "new") {
        let item = {
          id: detail.typeId,
          name: detail.newName
        };

        this._basesCheckbox._newInput(item);
      }

    } else if (typeof this._versionSelect !== "undefined") {
      if (detail.changed == "rename") {
        // console.log("Heard rename")
        for (let option of this._versionSelect._select.options) {
          if (option.value == detail.typeId) {
            return option.innerText = detail.newName;
          }
        }
      } else if (detail.changed == "remove") {
        // console.log("Heard remove")
        for (let i in this._versionSelect._select.options) {
          let option = this._versionSelect._select.options[i];
          if (option.value == detail.typeId) {
            this._versionSelect._select.remove(i);
          }
        }
      } else if (detail.changed == "new") {
        const newOption = document.createElement("option");
        newOption.value = detail.typeId,
        newOption.innerText = detail.newName
        this._versionSelect._select.appendChild(newOption);
      }

    }
  }

}

if (!customElements.get("type-form")) {
  customElements.define("type-form", TypeForm);
}
