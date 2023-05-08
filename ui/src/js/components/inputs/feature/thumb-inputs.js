import { TatorElement } from "../../tator-element.js";
import { hasPermission } from "../../../util/has-permission.js";
import { InputValidation } from "../input-validation.js";
import { InlineWarning } from "../../../components/inline-warning.js";
import { SingleUpload } from "./single-upload.js";
import TatorSymbol from "../../../../images/tator-logo-symbol-only.png";

export class ThumbInput extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-2 position-relative"
    );
    this._shadow.appendChild(div);

    this._name = document.createTextNode("");
    div.appendChild(this._name);

    this.styleSpan = document.createElement("span");
    this.styleSpan.setAttribute("class", "px-1 d-flex flex-items-center col-8");
    div.appendChild(this.styleSpan);

    // Preview Image
    this._previewImg = document.createElement("img");
    this._previewImg.setAttribute("crossorigin", "anonymous");
    this._previewImg.style.height = "84px"; // @TODO create a export class in form css for thumb input?
    this._previewImg.style.width = "84px";
    this._previewImg.setAttribute("class", "projects__image py-4");
    this.styleSpan.appendChild(this._previewImg);

    // Edit button
    this.editButton = document.createElement("label");
    this.editButton.append(document.createTextNode("Edit"));
    this.editButton.setAttribute(
      "class",
      `btn btn-clear btn-charcoal btn-small position-absolute btn-edit-overlay `
    );
    this.styleSpan.append(this.editButton);

    // Input is tied to the Edit button with "for" attribute
    // This input hits S3 to get a url for the hidden input
    this._editInput = document.createElement("input");
    this._editInput.setAttribute("class", "form-control input-sm col-8");
    this._editInput.setAttribute("type", "file");
    this._editInput.style.position = "absolute";
    this._editInput.style.left = "-99999rem";
    this.styleSpan.appendChild(this._editInput);

    // Image upload visible, and hidden - Plus Custom warning area.
    this.uploadWarningRow = document.createElement("div");
    this.uploadWarningRow.setAttribute(
      "class",
      "offset-md-3 offset-sm-4 col-md-9 col-sm-8 pb-3"
    );
    this._editInput.appendChild(this.uploadWarningRow);

    // Validate file size / show warning
    this.validate = new InputValidation();
    const warning = new InlineWarning();
    this.uploadWarningRow.appendChild(warning.div());

    // This input is URL to send to an endpoint
    this._hiddenInput = document.createElement("text-input");
    this._hiddenInput.setAttribute("type", "hidden");
    this.styleSpan.appendChild(this._hiddenInput);

    // this._editInput.addEventListener("change", (e) => {
    //   this._editListeners(e);
    //   this.dispatchEvent(new Event("change"));
    // });

    this._editInput.addEventListener("change", this._editListeners.bind(this));

    // this._input.addEventListener("focus", () => {
    //   document.body.classList.add("shortcuts-disabled");
    // });

    // this._input.addEventListener("blur", () => {
    //   document.body.classList.remove("shortcuts-disabled");
    // });

    this._editInput.addEventListener("input-invalid", (e) => {
      warning.show(e.detail.errorMsg);
      this._editInput.classList.add("invalid");
    });

    this._editInput.addEventListener("input-valid", (e) => {
      this._editInput.classList.remove("invalid");
      warning.hide();
    });
  }

  static get observedAttributes() {
    return ["name", "for"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "name":
        this._name.nodeValue = newValue;
        break;
      case "for":
        //this._hiddenInput.setAttribute("name", newValue);
        this._editInput.id = `${newValue}_visible`;
        this._editInput.setAttribute("name", `${newValue}_visible`);
        this.editButton.setAttribute("for", `${newValue}_visible`);
        this._previewImg.title = `Previewing image for ${newValue}`;
        break;
    }
  }

  set permission(val) {
    if (hasPermission(val, "Can Edit")) {
      this._input.removeAttribute("readonly");
      this._input.classList.remove("disabled");
    } else {
      this._input.setAttribute("readonly", "");
      this._input.classList.add("disabled");
    }
  }

  set default(val) {
    this._default = val;
  }

  changed() {
    return this.getValue() !== this._default;
  }

  reset() {
    // Go back to default value
    if (typeof this._default !== "undefined") {
      this.setValue(this._default);
    } else {
      this.setValue("");
    }
  }

  getValue() {
    return this._hiddenInput.getValue();
  }

  setValue(val) {
    this._preview(val); // @TODO should this be here
    this._hiddenInput.setValue(val);
  }

  set projectId(val) {
    this._projectId = val;
  }

  set organizationId(val) {
    this._organizationId = val;
  }

  //
  _editListeners(e) {
    this.dispatchEvent(new Event("change"));
    console.log(this._projectId);
    const file = e.target.files[0];
    let uploadData = {
      file,
      projectId: this._projectId,
      organizationId: this._organizationId, // Only one of organizationId or projectId required
      gid: "",
      section: "",
      mediaTypeId: null,
      username: "",
      isImage: true,
    };

    // set preview
    this._preview(file);

    // upload file and set input
    let uploader = new SingleUpload(uploadData);
    uploader.start().then((key) => {
      this._hiddenInput.setValue(key);
    });

    // Dispatch events to validate, and listen for errors
    let hasError = this.validate.findError("thumb_size", file.size);
    if (hasError) {
      let errorEvent = new CustomEvent("input-invalid", {
        detail: { errorMsg: hasError },
      });
      this._editInput.dispatchEvent(errorEvent);
    } else {
      let successEvent = new CustomEvent("input-valid");
      this._editInput.dispatchEvent(successEvent);
    }
  }

  _preview(img) {
    console.log("Preview this image string --- " + img);
    if (typeof img !== "string") {
      try {
        this._previewImg.src = URL.createObjectURL(img);
      } catch (e) {
        this._previewImg.src = TatorSymbol;
      }
    } else if (img !== "") {
      this._previewImg.src = img;
    } else {
      this._previewImg.src = TatorSymbol;
    }
  }
}

customElements.define("thumb-input", ThumbInput);
