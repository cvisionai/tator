class TextInput extends TatorElement {
    constructor() {
      super();
  
      const div = document.createElement("div");
      div.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1");
      this._shadow.appendChild(div);
  
      this._name = document.createTextNode("");
      div.appendChild(this._name);

      // Preview Image
      const imgEl = document.createElement("img");
      imgEl.style.height = "84px"; // @TODO create a class in form css for thumb input?
      imgEl.style.width = "84px";
      imgEl.title = labelText;
      imgEl.setAttribute("class", "projects__image py-4");

      // Edit button
      const editButton = document.createElement("label");
      editButton.append( document.createTextNode("Edit") );
      editButton.setAttribute("class", `btn btn-clear btn-charcoal text-semibold btn-edit-overlay btn-small position-relative`);
  
      // Input is tied to the Edit button with "for" attribute
      // This input hits S3 to get a url for the hidden input
      this._editInput = document.createElement("text-input");
      this._editInput.setAttribute("type", "file");
      this._editInput.style.position = "absolute; left: -99999rem";
      this._editInput.addEventListener("change", this._editListeners.bind(this));
      div.appendChild(this._editButtonInput);

      // Image upload visible, and hidden - Plus Custom warning area.
      this.uploadWarningRow = document.createElement("div");
      this.uploadWarningRow.setAttribute("class", "offset-md-3 offset-sm-4 col-md-9 col-sm-8 pb-3");
      this._editInput.appendChild(this.uploadWarningRow);
         
      // This input is URL to send to an endpoint
      this._hiddenInput = document.createElement("text-input");
      this._hiddenInput.setAttribute("type", "hidden");
      this._hiddenThumbInput.setValue(this.data.thumb);
      this._hiddenThumbInput.default = this.data.thumb;
      this._hiddenThumbInput.addEventListener("change", this._formChanged.bind(this));
      this._form.appendChild(this._hiddenThumbInput);
  
      this._input.addEventListener("change", () => {
        if (this.getValue() === null) {
          this._input.classList.add("has-border");
          this._input.classList.add("is-invalid");
        } else {
          this._input.classList.remove("has-border");
          this._input.classList.remove("is-invalid");
        }
        this.dispatchEvent(new Event("change"));
      });
  
      this.getValue = this._validateString;
  
      this._input.addEventListener("focus", () => {
        document.body.classList.add("shortcuts-disabled");
      });
  
      this._input.addEventListener("blur", () => {
        document.body.classList.remove("shortcuts-disabled");
      });
  
    }
  
    static get observedAttributes() {
      return ["name", "for-id"];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      switch (name) {
        case "name":
          this._name.nodeValue = newValue;
          break;
        case "for-property":
          this._hiddenInput.setAttribute("name", newValue);
          this._editInput.setAttribute("name", `${newValue}_visible`);
          editButton.setAttribute("for", `${newValue}_visible`); // @TODO set this in form
          this._editInput.id = `${newValue}_visible`; 
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
  
    changed(){
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

    _validateString() {
        return this._input.value;
      }
  
    _validateFileString() {
      return this._input.value;
    }
  
    setValue(val) {
      this._preview(val);
      this._hiddenInput.value = val;
    }

    //
  _editListeners() {
    (e) => {
      let file = e.target.files[0];
      let token = getCookie("csrftoken");
      let gid =  "";
      let section = "";
      let projectId = this.projectId;
      let mediaTypeId = null;
      let username = "";
      let isImage = true;    
      let uploadData = {
        file,
        projectId,
        gid,
        section,
        mediaTypeId,
        username,
        token,
        isImage
      };

      // set preview
      this._thumbnailPreview(file);

      // upload file and set input
      let uploader = new SingleUpload( uploadData );
      uploader.start().then( (key) => {
        this._hiddenThumbInput.setValue(key);
      });

      // Validate file size / show warning
      this.validate = new TypeFormValidation();
      const warning = new InlineWarning();
      this.uploadWarningRow.appendChild(warning.div());

      // Dispatch events to validate, and listen for errors
      let hasError = this.validate.findError("thumb_size", file.size);
      if(hasError){
        let errorEvent = new CustomEvent("input-invalid", {"detail" : 
          {"errorMsg" : hasError}
        });
        this._thumbEdit.dispatchEvent(errorEvent);
      } else {
        let successEvent = new CustomEvent("input-valid");
        this._thumbEdit.dispatchEvent(successEvent);
      }
    });

    this._thumbEdit.addEventListener("input-invalid", (e) => {
      warning.show(e.detail.errorMsg);
      this._thumbEdit.classList.add("invalid");
    });

    this._thumbEdit.addEventListener("input-valid", (e) => {
      this._thumbEdit.classList.remove("invalid");
      warning.hide();
    });

  }

  _preview(img, isFile = true) {
    // @TODO when we move inputHelper.editImageUpload remove query selector
    let outputElement = this._thumbEdit.querySelector(".projects__image");

    if(isFile) {
      outputElement.src = URL.createObjectURL( img );
    } else {
      outputElement.src = img;
    }
    
    return outputElement;
  }
  
}

customElements.define("text-input", TextInput);  