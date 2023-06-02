import { LoadingSpinner } from "../../components/loading-spinner.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { AttributesClone } from "./attributes-clone.js";
import { AttributesData } from "./data-attributes-clone.js";
import { AttributesDelete } from "./attributes-delete.js";
import { store, getAttributeDataByType } from "../store.js";

/**
 * Main Attribute section for type forms
 *
 * Note: This is NOT a tatorElement
 * - It is basic HTMLElement so it does not inherit _shadow, etc.
 * - This allows access to inner components from type form, or a parent shadow dom
 * - Custom El cannot have children in constructor which is why main div defined in "_init"
 *
 */
export class AttributesMain extends HTMLElement {
  constructor() {
    super();
    this.loading = new LoadingSpinner();
    this.loadingImg = this.loading.getImg();

    this.attrForms = [];
    this.hasChanges = false;
  }

  resetChanges() {
    this.hasChanges = false;
  }

  _init(typeName, fromId, fromName, projectId, data, modal) {
    // Init object global vars
    this.fromId = fromId;
    this.fromName = fromName;
    this.typeName = typeName;
    this.typeId = fromId;
    this.projectId = projectId;
    this.modal = modal;

    // add main div
    this.attributeDiv = document.createElement("div");
    this.appendChild(this.attributeDiv);
    this.appendChild(this.loadingImg);

    // Required helpers.
    this.refreshTypeEvent = new Event("settings-refresh");

    // Section h1.
    this._h2 = document.createElement("h2");
    this._h2.setAttribute(
      "class",
      "h3 pb-3 edit-project__h1 text-normal text-gray"
    );
    const t = document.createTextNode(`Attributes`);
    this._h2.appendChild(t);
    this.attributeDiv.appendChild(this._h2);

    // Create a styled box & Add box to page
    this.attributeBox = document.createElement("div");
    this.attributeBox.setAttribute(
      "class",
      `py-3 rounded-2 edit-project__config`
    ); //
    this.attributeDiv.appendChild(this.attributeBox);

    // Add the form and +Add links
    this.attributeBox.appendChild(this._getAttributesSection(data));
    this.attributeBox.appendChild(this._getNewAttributesTrigger());
    this.attributeBox.appendChild(this._getCopyAttributesTrigger());

    return this.attributeDiv;
  }

  _getAttributesSection(attributeTypes = []) {
    let attributesSection = document.createElement("div");

    if (attributeTypes && attributeTypes.length > 0) {
      const heading = document.createElement("h3");
      heading.setAttribute("class", "f1 text-gray pb-3");

      const addText = document.createElement("span");
      addText.setAttribute("class", "");
      addText.appendChild(
        document.createTextNode(` Edit Attributes (${attributeTypes.length})`)
      );

      // heading.appendChild(addPlus);
      heading.appendChild(addText);

      attributesSection.appendChild(heading);

      let attributeList = document.createElement("div");
      attributeList.setAttribute("class", `attributes-edit--list`);
      attributesSection.appendChild(attributeList);

      // Sort the attributes according to their `order` for display
      attributeTypes.sort((a, b) => a["order"] - b["order"]);

      // Loop through and output attribute forms
      for (let a in attributeTypes) {
        let attributeContent = this.attributesOutput({
          attributes: attributeTypes[a],
          attributeId: a,
        });
        attributeList.appendChild(attributeContent);
      }
    }

    return attributesSection;
  }

  // Add Attribute
  _getNewAttributesTrigger() {
    const newAttributeTrigger = document.createElement("a");
    newAttributeTrigger.setAttribute(
      "class",
      "py-2 my-2 clickable add-new-in-form add-new d-flex flex-items-center px-3 text-gray rounded-2"
    );

    const addPlus = document.createElement("span");
    addPlus.setAttribute(
      "class",
      "add-new__icon d-flex flex-items-center flex-justify-center text-white circle"
    );
    addPlus.appendChild(document.createTextNode("+"));

    const addText = document.createElement("span");
    addText.setAttribute("class", "px-3");
    addText.appendChild(document.createTextNode(" New Attribute"));

    newAttributeTrigger.appendChild(addPlus);
    newAttributeTrigger.appendChild(addText);

    newAttributeTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      let afObj = this._getAddForm();

      afObj.submitAttribute.addEventListener("click", (e) => {
        e.preventDefault();

        this._postAttribute(afObj.attrForm);
      });

      this.modal._confirm({
        titleText: "New Attribute",
        mainText: afObj.attrForm.form,
        buttonSave: afObj.submitAttribute,
        scroll: true,
      });
      this.modal._div.classList.add("modal-wide");
      this.setAttribute("has-open-modal", "");
    });

    return newAttributeTrigger;
  }

  _getAddForm() {
    let attrForm = document.createElement("attributes-form");
    attrForm._initEmptyForm();

    let submitAttribute = document.createElement("input");
    submitAttribute.setAttribute("type", "submit");
    submitAttribute.setAttribute("value", "Save");
    submitAttribute.setAttribute("class", `btn btn-clear f1 text-semibold`);

    return { attrForm, submitAttribute };
  }

  _postAttribute(formObj) {
    this.modal._modalCloseAndClear();
    this.loading.showSpinner();

    let formJSON = {
      entity_type: this.typeName,
      addition: formObj._getAttributeFormData().formData,
    };

    let status = 0;
    this._fetchPostPromise({ formData: formJSON })
      .then((response) => {
        status = response.status;
        return response.json();
      })
      .then((data) => {
        let currentMessage = data.message;

        if (status == 201) {
          // iconWrap.appendChild(succussIcon);
          this.loading.hideSpinner();
          this.modal._success(currentMessage);

          // Replaces dispatchRefresh
          store.getState().fetchType(this.typeName);
        } else if (status == 400) {
          // iconWrap.appendChild(warningIcon);
          this.loading.hideSpinner();
          this.modal._error(`${currentMessage}`);
        }
      })
      .catch((error) => {
        this.loading.hideSpinner();
        this.modal._error(`Error: ${error}`);
      });
  }

  // Clone Attribute
  _getCopyAttributesTrigger() {
    const newCopyTrigger = document.createElement("a");
    newCopyTrigger.setAttribute(
      "class",
      "py-2 my-2 clickable add-new-in-form add-new d-flex flex-items-center px-3 text-gray rounded-2"
    );

    const addPlus = document.createElement("span");
    addPlus.setAttribute(
      "class",
      "add-new__icon d-flex flex-items-center flex-justify-center text-white circle"
    );
    addPlus.appendChild(document.createTextNode("+"));

    const addText = document.createElement("span");
    addText.setAttribute("class", "px-3");
    addText.appendChild(document.createTextNode(" Clone Existing"));

    newCopyTrigger.appendChild(addPlus);
    newCopyTrigger.appendChild(addText);

    newCopyTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      this._getCloneModal();
    });

    return newCopyTrigger;
  }

  async _getCloneModal() {
    this.loading.showSpinner();

    const attributeDataByType = await getAttributeDataByType();
    console.log("attributeDataByType ", attributeDataByType);
    this.clone = new AttributesClone(attributeDataByType);
    const cloneForm = this.clone._init();

    const cloneSave = document.createElement("input");
    cloneSave.setAttribute("type", "submit");
    cloneSave.setAttribute("value", "Save");
    cloneSave.setAttribute("class", `btn btn-clear f1 text-semibold`);

    cloneSave.addEventListener("click", this._saveClone.bind(this));

    this.loading.hideSpinner();
    this.modal._div.classList.add("modal-wide");
    return this.modal._confirm({
      titleText: "Clone Attribute(s)",
      mainText: cloneForm,
      buttonSave: cloneSave,
      scroll: true,
    });
  }

  async _saveClone(evt) {
    evt.preventDefault();
    this.modal._modalCloseAndClear();
    this.loading.showSpinner();
    const selectedData = this.clone.getInputData();

    let cloneData = new AttributesData({
      projectId: this.projectId,
      typeId: this.fromId,
      typeName: this.typeName,
      selectedData,
    });

    const resp = await cloneData.createClones();
    if (resp.ok) {
      this.loading.hideSpinner();
      this.modal._success(resp.message);
    } else {
      this.loading.hideSpinner();
      this.modal._complete(resp.message);
    }

    // Refetch the type is a refresh event
    store.getState().fetchType(this.typeName);
  }

  _toggleAttributes(el) {
    let hidden = el.hidden;

    return (el.hidden = !hidden);
  }

  _toggleChevron(e) {
    var el = e.target;
    return el.classList.toggle("chevron-trigger-90");
  }

  attributesOutput({ attributes = [], attributeId = undefined } = {}) {
    let innerAttributeBox = document.createElement("div");
    innerAttributeBox.setAttribute(
      "class",
      "attributes-edit flex-items-center rounded-2 d-flex flex-row"
    );
    this.attributeBox.appendChild(innerAttributeBox);

    let attributeCurrent = document.createElement("div");
    attributeCurrent.textContent = attributes.name;
    attributeCurrent.setAttribute(
      "class",
      "css-truncate col-10 px-3 clickable"
    );
    innerAttributeBox.appendChild(attributeCurrent);

    let editIcon = document.createElement("div");
    editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    editIcon.setAttribute(
      "class",
      "clickable text-gray hover-text-white py-2 px-2"
    );
    innerAttributeBox.appendChild(editIcon);

    let deleteIcon = document.createElement("delete-button");
    // deleteIcon.textContent = "[D]";
    deleteIcon.setAttribute("class", "clickable");
    innerAttributeBox.appendChild(deleteIcon);

    // editIcon.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // deleteIcon.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // attributeCurrent.addEventListener("mouseover", ()=>{
    //   editIcon.classList.remove("hidden");
    //   deleteIcon.classList.remove("hidden");
    // });

    // attributeCurrent.addEventListener("mouseleave", ()=>{
    //   editIcon.classList.add("hidden");
    //   deleteIcon.classList.add("hidden");
    // });

    attributeCurrent.addEventListener("click", () => {
      this._launchEdit(attributes);
    });

    editIcon.addEventListener("click", () => {
      this._launchEdit(attributes);
    });

    deleteIcon.addEventListener("click", () => {
      this._deleteAttrConfirm(attributes.name);
    });

    return innerAttributeBox;
  }

  _launchEdit(attributes) {
    // Avoid special name default in var later on
    attributes._default = attributes.default;
    let formId = attributes.name.replace(/[^\w]|_/g, "").toLowerCase();

    // Fields for this form
    let attrForm = document.createElement("attributes-form");

    // create form and attach to the el
    attrForm._getFormWithValues(attributes);
    attrForm.form.setAttribute("class", "attribute-form px-4");
    attrForm.setAttribute("data-old-name", attributes.name);
    attrForm.id = `${formId}_${this.fromId}`;
    attrForm.form.data = attributes; // @TODO how is this used?
    // attrForm.hidden = true;

    let attrSave = document.createElement("input");
    attrSave.setAttribute("type", "submit");
    attrSave.setAttribute("value", "Save");
    attrSave.setAttribute("class", `btn btn-clear f1 text-semibold`);

    attrSave.addEventListener("click", async (e) => {
      e.preventDefault();
      this.modal._modalCloseAndClear();
      this.loading.showSpinner();
      const attributeFormData = attrForm._attributeFormData({
        entityType: this.typeName,
        id: this.fromId,
      });
      await this._fetchAttributePutPromise(this.fromId, attributeFormData);
      this.loading.hideSpinner();
    });

    this.modal._div.classList.add("modal-wide");
    this.modal._confirm({
      titleText: "Edit Attribute",
      mainText: attrForm,
      buttonSave: attrSave,
      scroll: true,
    });
  }

  /**
   * Deprecated.....
   */
  deleteAttr(name) {
    let button = document.createElement("button");
    button.setAttribute(
      "class",
      "btn btn-small btn-charcoal float-right btn-outline text-gray"
    );
    button.style.marginRight = "10px";

    let deleteText = document.createTextNode(`Delete`);
    button.appendChild(deleteText);

    let descriptionText = `Delete ${name} from this ${this.typeName} and all its data?`;
    let headingDiv = document.createElement("div");
    headingDiv.setAttribute("class", "clearfix py-6");

    let heading = document.createElement("div");
    heading.setAttribute(
      "class",
      "py-md-5 float-left col-md-5 col-sm-5 text-right"
    );

    heading.appendChild(button);

    let description = document.createElement("div");
    let _descriptionText = document.createTextNode("");
    _descriptionText.nodeValue = descriptionText;
    description.setAttribute(
      "class",
      "py-md-6 f1 text-gray float-left col-md-7 col-sm-7"
    );
    description.appendChild(_descriptionText);

    headingDiv.appendChild(heading);
    headingDiv.appendChild(description);

    this.deleteBox = document.createElement("div");
    deleteBox.setAttribute("class", `py-3 rounded-2 edit-project__config`);
    deleteBox.appendChild(headingDiv);

    this.deleteBox.style.backgroundColor = "transparent";

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this._deleteAttrConfirm(name);
    });

    return this.deleteBox;
  }

  _deleteAttrConfirm(name) {
    let button = document.createElement("button");
    let confirmText = document.createTextNode("Confirm");
    button.appendChild(confirmText);
    button.setAttribute("class", "btn btn-clear f1 text-semibold");

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this._deleteAttrType(name);
    });

    this.modal._confirm({
      titleText: `Delete Confirmation`,
      mainText: `Pressing confirm will delete attribute "${name}". Do you want to continue?`,
      buttonSave: button,
      scroll: false,
    });
  }

  _deleteAttrType(name) {
    this.modal._modalCloseAndClear();
    this.loading.showSpinner();

    let deleteAttribute = new AttributesDelete({
      type: this.typeName,
      typeId: this.fromId,
      attributeName: name,
    });

    if (name != "undefined") {
      deleteAttribute
        .deleteFetch()
        .then((data) => {
          this.loading.hideSpinner();
          // this.dispatchEvent(this.refreshTypeEvent);

          if (data.status == 200) {
            this.modal._success(data.message);
          } else {
            this.modal._error(data.message);
          }

          // Refetch the type is a refresh event
          store.getState().fetchType(this.typeName);
        })
        .catch((err) => {
          console.error(err);
          this.loading.hideSpinner();
          returnthis.modal._error("Error with delete.");
        });
    } else {
      this.loading.hideSpinner();
      returnthis.modal._error("Error with delete.");
    }
  }

  _fetchPostPromise({ formData = null } = {}) {
    if (formData != null) {
      return fetchCredentials("/rest/AttributeType/" + this.fromId, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        body: JSON.stringify(formData),
      });
    } else {
      console.error("Problem with new attribute form data.");
    }
  }

  _fetchAttributePutPromise(parentTypeId, dataObject) {
    let promise = Promise.resolve();
    this.successMessages = "";
    this.failedMessages = "";
    this.confirmMessages = "";
    this.saveModalMessage = "";
    this.requiresConfirmation = false;
    const formData = dataObject.formData;
    const attributeNewName = dataObject.newName;
    const attributeOldName = dataObject.oldName;

    promise = promise
      .then(() => {
        return fetchCredentials("/rest/AttributeType/" + parentTypeId, {
          method: "PUT",
          mode: "cors",
          credentials: "include",
          body: JSON.stringify(formData),
        });
      })
      .then((response) => {
        return response
          .json()
          .then((data) => ({ response: response, data: data }));
      })
      .then((obj) => {
        let currentMessage = obj.data.message;
        let response = obj.response;
        let succussIcon = document.createElement("modal-success");
        let iconWrap = document.createElement("span");
        let warningIcon = document.createElement("modal-warning");

        if (response.status == 200) {
          iconWrap.appendChild(succussIcon);
          this.successMessages += `<div class="py-2">${iconWrap.innerHTML} <span class="v-align-top">${currentMessage}</span></div>`;
        } else if (response.status != 200) {
          iconWrap.appendChild(warningIcon);
          this.failedMessages += `<div class="py-4">${iconWrap.innerHTML} <span class="v-align-top">Changes editing ${attributeOldName} not saved.</span></div> <div class="f1">Error: ${currentMessage}</div>`;
        }
      })
      .then(() => {
        if (this.successMessages !== "") {
          let heading = `<div class=" pt-4 h3 pt-4">Success</div>`;
          this.saveModalMessage += heading + this.successMessages;
        }
        if (this.failedMessages !== "") {
          let heading = `<div class=" pt-4 h3 pt-4">Error</div>`;
          this.saveModalMessage += heading + this.failedMessages;
        }

        let mainText = `${this.saveModalMessage}`;

        if (this.failedMessages !== "") {
          this.modal._complete(mainText);
        } else {
          this.modal._success(mainText);
        }
        // Reset forms to the saved data from model
        // return this.dispatchEvent(this.refreshTypeEvent);
        // Refetch the type is a refresh event
        store.getState().fetchType(this.typeName);
      })
      .then(() => {
        this.loading.hideSpinner();
      })
      .catch((err) => {
        return console.error("Problem patching attr...", err);
      });

    return promise;
  }
}

customElements.define("attributes-main", AttributesMain);
