import { ModalDialog } from "./modal-dialog.js";
import "./inputs/feature/attribute-choices.js";

export class UploadDialogInit extends ModalDialog {
  constructor() {
    super();

    this._typeAttributeMap = new Map();

    this._title.nodeValue = "Upload";
    this._modal.classList.add("fixed-height-scroll");

    this._form = document.createElement("form");
    this._form.setAttribute("class", "modal__form");
    this._main.appendChild(this._form);

    const formGroup2 = document.createElement("div");
    formGroup2.setAttribute("class", "form-group");
    this._form.appendChild(formGroup2);

    this._parentFolders = document.createElement("enum-input");
    this._parentFolders.setAttribute("class", "text-gray f2");
    this._parentFolders.setAttribute("name", " Folder:");
    formGroup2.appendChild(this._parentFolders);

    this._mediaFormGroup = document.createElement("details");
    this._mediaFormGroup.setAttribute("class", "hidden form-group");
    this._form.appendChild(this._mediaFormGroup);

    this._helpText = document.createElement("summary");
    this._helpText.setAttribute(
      "class",
      "text-light-gray text-underline f2 clickable pt-3"
    );

    const closedText = `
		  <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M9 6l6 6l-6 6"></path>
      </svg> Advanced
		`;

    const openText = `
		<svg transform="rotate(90)" width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M9 6l6 6l-6 6"></path>
      </svg> Advanced
	`;

    const upArrow = `<svg class="no-fill px-1 py-1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-corner-left-up"><polyline points="14 9 9 4 4 9"/><path d="M20 20h-7a4 4 0 0 1-4-4V4"/></svg>`;

    this._helpText.innerHTML = closedText;

    this._mediaFormGroup.addEventListener("toggle", (event) => {
      if (this._mediaFormGroup.open) {
        /* the element was toggled open */
        this._helpText.innerHTML = openText;
      } else {
        /* the element was toggled closed */
        this._helpText.innerHTML = closedText;
      }
    });

    this._helpText0 = document.createElement("div");
    this._helpText0.setAttribute("class", "f3 text-gray py-3");
    this._helpText0.innerHTML = `
		  <p class="pb-2">Specify the media type (useful when multiple types areconfigured).</p>
			<p>Optionally, set an attribute value for this type during media creation.</p>
		`;
    this._mediaFormGroup.appendChild(this._helpText0);

    this._mediaFormGroup.appendChild(this._helpText);

    this._helpText2 = document.createElement("p");
    this._helpText2.setAttribute("class", "text-gray f2 py-2");
    this._helpText2.innerText = ``;
    this._mediaFormGroup.appendChild(this._helpText2);

    this._imageType = document.createElement("enum-input");
    this._imageType.setAttribute("class", "text-gray f2");
    this._imageType.setAttribute("name", "Image Type:");
    this._imageType.permission = "View only";
    this._mediaFormGroup.appendChild(this._imageType);

    this._imageAttributes = document.createElement("attribute-choices");
    this._imageAttributes.setAttribute("class", "text-gray f2 ");
    this._imageAttributes.setAttribute("name", `${upArrow}`);
    this._imageAttributes.permission = "View only";
    this._mediaFormGroup.appendChild(this._imageAttributes);

    this._videoType = document.createElement("enum-input");
    this._videoType.setAttribute(
      "style",
      "border-top: 1px solid var(--color-charcoal--light); margin-top: 15px;"
    );
    this._videoType.setAttribute(
      "class",
      "text-gray f2 border-top pt-2 d-block"
    );
    this._videoType.setAttribute("name", "Video Type:");
    this._videoType.permission = "View only";
    this._mediaFormGroup.appendChild(this._videoType);

    this._videoAttributes = document.createElement("attribute-choices");
    this._videoAttributes.setAttribute("class", "text-gray f2 ");
    this._videoAttributes.setAttribute("name", `${upArrow}`);
    this._videoAttributes.permission = "View only";
    this._mediaFormGroup.appendChild(this._videoAttributes);

    this._saveSettings = document.createElement("checkbox-input");
    this._saveSettings.setAttribute(
      "class",
      "text-light-gray pt-3 f2 d-block hidden"
    );
    this._saveSettings.setAttribute(
      "name",
      "Save these settings for the duration of this session"
    );
    this._saveSettings.setValue({ id: "save", checked: true });
    this._mediaFormGroup.appendChild(this._saveSettings);

    const apply = document.createElement("button");
    apply.setAttribute("class", "btn btn-clear");
    apply.textContent = "Choose Files";
    this._footer.appendChild(apply);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback.bind(this));

    apply.addEventListener("click", () => {
      this._closeCallback();
      this.dispatchEvent(
        new CustomEvent("choose-files", {
          detail: {
            attrVideo: this._videoAttributes.getValues(),
            attrImage: this._imageAttributes.getValues(),
          },
        })
      );
    });

    // Data initialization
    this._noParentName = "-- None --";
    this._sectionData = null;
    this._attrEnums = new Map();
    this._attrEnums.set("image", this._imageAttributes);
    this._attrEnums.set("video", this._videoAttributes);
  }

  static get observedAttributes() {
    return ModalDialog.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    ModalDialog.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "is-open":
        break;
    }
  }

  set mediaTypes(val) {
    this._mediaTypes = val;
    this._typeAttributeMap = new Map();

    const multipleImage = this.setupTypeDropdown("image", this._imageType);
    const multipleVideo = this.setupTypeDropdown("video", this._videoType);

    // if (multipleImage || multipleVideo) {
    this._mediaFormGroup.classList.remove("hidden");
    // }
  }

  setupTypeDropdown(type, element) {
    const list = [];
    for (let t of this._mediaTypes) {
      if (t.dtype === type) {
        list.push({ value: t.id, label: `${t.name} (ID:${t.id})`, extra: t });
        this._typeAttributeMap.set(t.id, t.attribute_types);
      }
    }

    if (list && list.length > 0) {
      list.sort((a, b) => {
        if (a.label < b.label) {
          return -1;
        }
        if (a.label > b.label) {
          return 1;
        }
        return 0;
      });

      list.sort((a, b) => {
        if (!a.extra.visible && b.extra.visible) {
          return 1;
        }
        if (!b.extra.visible && a.extra.visible) {
          return -1;
        }
        return 0;
      });

      list[0].label = `${list[0].label} - Default`;
      element.choices = list;
      element.setValue(list[0].value);
      this._setAttrList(list[0].extra.attribute_types, type);
    }

    element.addEventListener("change", (evt) => {
      const value = Number(element.getValue());
      const attrInfo = this._typeAttributeMap.get(value);
      this._setAttrList(attrInfo, type);
    });

    if (list.length > 0) {
      element.permission = "Can Edit";
    }

    return list.length > 1;
  }

  _setAttrList(attrList, type) {
    const list = [];
    if (attrList && attrList.length > 0) {
      for (let attr of attrList) {
        list.push({
          value: attr.name,
          label: `${attr.name}`,
          extra: attr,
        });
      }
    }

    if (this._attrEnums.has(type)) {
      this._attrEnums.get(type).clear();
      this._attrEnums.get(type).resetChoices();
      this._attrEnums.get(type).choices = list;
    }
  }

  open() {
    this.setupData();
    this.setAttribute("is-open", "true");
  }

  setupData() {
    const searchParams = new URLSearchParams(window.location.search),
      selectedSection = searchParams.get("section"),
      choices = this._sectionData.getFolderEnumChoices();

    choices.unshift({ value: this._noParentName, label: this._noParentName });
    this._parentFolders.resetChoices();
    this._parentFolders.choices = choices;

    if (selectedSection) {
      this._parentFolders.setValue(selectedSection);
    } else {
      this._parentFolders.setValue(this._noParentName);
    }
  }
}

customElements.define("upload-dialog-init", UploadDialogInit);
