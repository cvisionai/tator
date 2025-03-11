import { TatorElement } from "../../tator-element.js";
import { hasPermission } from "../../../util/has-permission.js";
import { fetchCredentials } from "../../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { InputValidation } from "../input-validation.js";
import { InlineWarning } from "../../inline-warning.js";
import { SingleUpload } from "./single-upload.js";

export class FileInput extends TatorElement {
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

    // This input is URL to send to an endpoint
    this._nameInput = document.createElement("text-input");

    // This input is URL to send to an endpoint
    this._hiddenInput = document.createElement("text-input");
    this._hiddenInput.setAttribute("class", "col-12");
    this._hiddenInput._input.setAttribute(
      "class",
      "form-control input-sm col-12 "
    );
    this._hiddenInput.setAttribute("type", "text");
    this._hiddenInput.permission = null;
    this.styleSpan.appendChild(this._hiddenInput);

    this._viewFile = document.createElement("a");
    this._viewFile.textContent = "View File";
    this._viewFile.setAttribute("target", "_blank");
    this._viewFile.setAttribute(
      "class",
      "offset-col-4 text-gray f3 clickable hover-white hidden pb-3 d-block"
    );
    this._viewFile.style.marginTop = "-5px";
    this._shadow.appendChild(this._viewFile);

    // Edit button
    this.editButton = document.createElement("label");
    this.editButton.append(document.createTextNode("Choose File"));
    this.editButton.style.width = "200px";
    this.editButton.setAttribute(
      "class",
      `btn btn-clear btn-charcoal btn-small mx-3`
    );
    this.styleSpan.append(this.editButton);

    // Input is tied to the Edit button with "for" attribute
    // This input hits S3 to get a url for the hidden input
    this._editInput = document.createElement("input");
    this._editInput.setAttribute("class", "form-control input-sm col-1");
    this._editInput.setAttribute("type", "file");
    this._editInput.style.position = "absolute";
    this._editInput.style.left = "-99999rem";
    this.styleSpan.appendChild(this._editInput);

    // Image upload visible, and hidden - Plus Custom warning area.
    this.uploadWarningRow = document.createElement("div");
    this.uploadWarningRow.setAttribute("class", "offset-col-4 pb-3");
    this._shadow.appendChild(this.uploadWarningRow);

    // Validate file size / show warning
    this._isImage = true;
    this.validate = new InputValidation();
    const warning = new InlineWarning();
    this.uploadWarningRow.appendChild(warning.div());

    this._editInput.addEventListener("change", this._editListeners.bind(this));

    this._editInput.addEventListener("input-invalid", (e) => {
      warning.show(e.detail.errorMsg);
      this._editInput.classList.add("invalid");
    });

    this._editInput.addEventListener("input-valid", (e) => {
      this._editInput.classList.remove("invalid");
      warning.hide();
    });

    this._projectId = null;
    this._organizationId = null;
  }

  static get observedAttributes() {
    return ["name", "for", "type"];
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
        // this._previewImg.title = `Previewing image for ${newValue}`;
        break;
      case "type":
        // TODO: This is weak because its only extension based
        // looking at type vs. extension would be better
        // actually parsing may be a bridge too far
        this._validExtensions = [];
        for (let supplied of newValue.split("|"))
        {
          this._validExtensions.push(supplied.toLowerCase());
        }
        this._validate = this.extensionValidate;

        if (newValue === "yaml") {
          // Add alias for yaml
          this._validExtensions.push("yml");
          this._isImage = null;
        }
        else if (newValue != "image") {
          this._isImage = null;
        }
    }
  }

  set permission(val) {
    if (hasPermission(val, "Can Edit")) {
      this._hiddenInput._input.removeAttribute("readonly");
      this._hiddenInput._input.classList.remove("disabled");
      this._editInput.removeAttribute("readonly");
      this._editInput.classList.remove("disabled");
      this.editButton.hidden = false;
    } else {
      this._hiddenInput._input.setAttribute("readonly", "");
      this._hiddenInput._input.classList.add("disabled");
      this._editInput.setAttribute("readonly", "");
      this._editInput.classList.add("disabled");
      this.editButton.hidden = true;
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
    this._hiddenInput.setValue(val);

    if (typeof val !== "undefined" && val !== null && val !== "") {
      this._viewFile.setAttribute("href", `${window.location.origin}${val}`);
      this._viewFile.classList.remove("hidden");
    } else {
      this._viewFile.setAttribute("href", ``);
      this._viewFile.classList.add("hidden");
    }
  }

  set projectId(val) {
    console.log("SET PROJECT ID " + val);
    this._projectId = val;
  }

  set organizationId(val) {
    this._organizationId = val;
  }

  //
  _editListeners(e) {
    this.dispatchEvent(new Event("change"));
    const blob = e.target.files[0];
    const fileName = blob.name;

    let uploadData = {
      file: blob,
      projectId: this._projectId,
      organizationId: this._organizationId,
      gid: "",
      section: "",
      mediaTypeId: null,
      username: "",
      isImage: this._isImage,
    };

    // upload file and set input
    let uploader = new SingleUpload(uploadData);
    uploader.start().then((key) => {
      let hasError = this._validate(blob);

      if (hasError) {
        let errorEvent = new CustomEvent("input-invalid", {
          detail: { errorMsg: hasError },
        });
        this.setValue("");
        this._editInput.dispatchEvent(errorEvent);
      } else {
        let successEvent = new CustomEvent("input-valid");
        this._editInput.dispatchEvent(successEvent);
        // console.log("Fetch download info")
        let bodyData = {
          keys: [key],
        };

        fetchCredentials(`/rest/DownloadInfo/${this._projectId}`, {
          method: "POST",
          body: JSON.stringify(bodyData),
        })
          .then((resp) => {
            return resp.json();
          })
          .then((data) => {
            // Check the related state types
            const bodyData = {
              name: fileName,
              upload_url: data[0].url,
            };

            // _fetchCall is defined in the instantiating page or parent element
            this._fetchCall(bodyData);
            this._editInput.value = "";
          });
      }
    });
  }

  _validate() {
    return null;
  }

  getFileName() {
    return this._nameInput.getValue();
  }

  extensionValidate(file) {
    // Find the file extension
    var extension = file.name.split('.').pop().toLowerCase();

    if (!this._validExtensions.includes(extension)) {
      return `File extension must be one of [${this._validExtensions.join(", ")}]`;
    }
    else
    {
      return false;
    }
  }
}

customElements.define("file-input", FileInput);
