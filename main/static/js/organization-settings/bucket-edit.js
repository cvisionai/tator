class BucketEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "Bucket";
    this.readableTypeName = "Bucket";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" ><path d="M11 1c-4.908 0-7.998 1.592-7.79 2.95 0.060 0.389 0.225 1.945 0.434 3.273-2.405 0.934-3.202 2.449-3.095 3.684 0.127 1.461 1.441 3.025 4.328 3.295 1.648 0.154 3.631-0.75 4.916-2.295-0.122-0.207-0.193-0.45-0.193-0.707 0-0.774 0.627-1.4 1.4-1.4s1.4 0.627 1.4 1.4c0 0.762-0.61 1.381-1.369 1.398-1.529 1.973-3.858 3.164-6.064 3.025 0.051 0.324 0.070 0.947 0.096 1.113 0.090 0.579 2.347 2.26 5.937 2.264 3.59-0.004 5.847-1.685 5.938-2.263 0.088-0.577 1.641-11.409 1.852-12.787 0.208-1.358-2.883-2.95-7.79-2.95zM1.943 10.785c-0.055-0.643 0.455-1.498 1.924-2.139 0.211 1.34 0.441 2.797 0.643 4.074-1.604-0.313-2.498-1.149-2.567-1.935zM11 6.024c-3.59-0.002-6.137-1.334-6.137-1.832-0.002-0.494 2.547-1.79 6.137-1.788 3.59-0.002 6.139 1.294 6.137 1.788 0 0.498-2.547 1.83-6.137 1.832z"></path></svg>';
  }

  init(data) {
    this._data = data;
  }

  _getEmptyData() {
    return {
      "id" : `New`,
      "organization" : this.organizationId,
      "name": "",
      "access_key": "",
      "secret_key": "",
      "endpoint_url": "",
      "region": "",
      "archive_sc": "DEEP_ARCHIVE",
      "live_sc": "STANDARD",
      "gcs_key_info": "",
      "form" : "empty"
    };
  }

  _getAttributeSection() {
    return document.createElement("div");
  }

  _getExistingForm(data) {
    console.log("Get existing form");
    console.log(data.id);

    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

    //
    this._setForm();

    // name
    this._editName = document.createElement("text-input");
    this._editName.setAttribute("name", "Name");
    this._editName.setAttribute("type", "string");
    this._editName.setValue(this.data.name);
    this._editName.default = this.data.name;
    this._editName.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editName);

    // access key
    this._editAccessKey = document.createElement("text-input");
    this._editAccessKey.setAttribute("name", "Access Key");
    this._editAccessKey.setAttribute("type", "string");
    this._editAccessKey.setValue(this.data.access_key);
    this._editAccessKey.default = this.data.access_key;
    this._editAccessKey.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editAccessKey);

    // secret key
    this._editSecretKey = document.createElement("text-input");
    this._editSecretKey.setAttribute("name", "Secret Key");
    this._editSecretKey.setAttribute("type", "password");
    this._editSecretKey.setValue(this.data.secret_key);
    this._editSecretKey.default = this.data.secret_key;
    this._editSecretKey.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editSecretKey);

    // endpoint url
    this._editEndpointUrl = document.createElement("text-input");
    this._editEndpointUrl.setAttribute("name", "Endpoint URL");
    this._editEndpointUrl.setAttribute("type", "string");
    this._editEndpointUrl.setValue(this.data.endpoint_url);
    this._editEndpointUrl.default = this.data.endpoint_url;
    this._editEndpointUrl.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editEndpointUrl);

    // region
    this._editRegion = document.createElement("text-input");
    this._editRegion.setAttribute("name", "Region");
    this._editRegion.setAttribute("type", "string");
    this._editRegion.setValue(this.data.region);
    this._editRegion.default = this.data.region;
    this._editRegion.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editRegion);

    // archive storage class
    this._editArchiveSc = document.createElement("text-input");
    this._editArchiveSc.setAttribute("name", "Archive Storage Class");
    this._editArchiveSc.setAttribute("type", "string");
    this._editArchiveSc.setValue(this.data.archive_sc);
    this._editArchiveSc.default = this.data.archive_sc;
    this._editArchiveSc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editArchiveSc);

    // live storage class
    this._editLiveSc = document.createElement("text-input");
    this._editLiveSc.setAttribute("name", "Live Storage Class");
    this._editLiveSc.setAttribute("type", "string");
    this._editLiveSc.setValue(this.data.live_sc);
    this._editLiveSc.default = this.data.live_sc;
    this._editLiveSc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editLiveSc);

    // GCS key info
    this._editGcsKeyInfo = document.createElement("text-input");
    this._editGcsKeyInfo.setAttribute("name", "GCS Key Info");
    this._editGcsKeyInfo.setAttribute("type", "string");
    this._editGcsKeyInfo.setValue(this.data.gcs_key_info);
    this._editGcsKeyInfo.default = this.data.gcs_key_info;
    this._editGcsKeyInfo.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editGcsKeyInfo);

    current.appendChild(this._form);

    return current;
  }

  _getNewForm(data) {
    console.log("Get new form");
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );
    this._setForm();

    // name
    this._editName = document.createElement("text-input");
    this._editName.setAttribute("name", "Name");
    this._editName.setAttribute("type", "string");
    this._form.appendChild(this._editName);

    // access key
    this._editAccessKey = document.createElement("text-input");
    this._editAccessKey.setAttribute("name", "Access Key");
    this._editAccessKey.setAttribute("type", "string");
    this._form.appendChild(this._editAccessKey);

    // secret key
    this._editSecretKey = document.createElement("text-input");
    this._editSecretKey.setAttribute("name", "Secret Key");
    this._editSecretKey.setAttribute("type", "password");
    this._form.appendChild(this._editSecretKey);

    // endpoint url
    this._editEndpointUrl = document.createElement("text-input");
    this._editEndpointUrl.setAttribute("name", "Endpoint URL");
    this._editEndpointUrl.setAttribute("type", "string");
    this._form.appendChild(this._editEndpointUrl);

    // region
    this._editRegion = document.createElement("text-input");
    this._editRegion.setAttribute("name", "Region");
    this._editRegion.setAttribute("type", "string");
    this._form.appendChild(this._editRegion);

    // archive storage class
    this._editArchiveSc = document.createElement("text-input");
    this._editArchiveSc.setAttribute("name", "Archive Storage Class");
    this._editArchiveSc.setAttribute("type", "string");
    this._form.appendChild(this._editArchiveSc);

    // live storage class
    this._editLiveSc = document.createElement("text-input");
    this._editLiveSc.setAttribute("name", "Live Storage Class");
    this._editLiveSc.setAttribute("type", "string");
    this._form.appendChild(this._editLiveSc);

    // GCS key info
    this._editGcsKeyInfo = document.createElement("text-input");
    this._editGcsKeyInfo.setAttribute("name", "GCS Key Info");
    this._editGcsKeyInfo.setAttribute("type", "string");
    this._form.appendChild(this._editGcsKeyInfo);

    current.appendChild(this._form);

    return current;
  }

  _getSectionForm(data) {
    if (data.id == "New") {
      return this._getNewForm(data);
    } else {
      return this._getExistingForm(data);
    }
  }
  
  _getFormData(id) {
    let formData;
    if (id == "New") {
      formData = [];
      const users = this._userData.getUsers();
      for (const user of users.values()) {
        formData.push({
          organization: this.organizationId,
          name: this._editName.getValue(),
          access_key: this._editAccessKey.getValue(),
          secret_key: this._editSecretKey.getValue(),
          endpoint_url: this._editEndpointUrl.getValue(),
          region: this._editRegion.getValue(),
          archive_sc: this._editArchiveSc.getValue(),
          live_sc: this._editLiveSc.getValue(),
          gcs_key_info: this._editGcsKeyInfo.getValue(),
        });
      }
    } else {
      formData = {};

      if (this._editName.changed()) {
        formData.name = this._editName.getValue();
      }

      if (this._editAccessKey.changed()) {
        formData.access_key = this._editAccessKey.getValue();
      }

      if (this._editSecretKey.changed()) {
        formData.secret_key = this._editSecretKey.getValue();
      }

      if (this._editEndpointUrl.changed()) {
        formData.endpoint_url = this._editEndpointUrl.getValue();
      }

      if (this._editRegion.changed()) {
        formData.region = this._editRegion.getValue();
      }

      if (this._editArchiveSc.changed()) {
        formData.archive_sc = this._editArchiveSc.getValue();
      }

      if (this._editLiveSc.changed()) {
        formData.live_sc = this._editLiveSc.getValue();
      }

      if (this._editGcsKeyInfo.changed()) {
        formData.gcs_key_info = this._editGcsKeyInfo.getValue();
      }
    }

    return formData;
  }

  _savePost() {
    this.loading.showSpinner();

    let formDataList = this._getFormData("New", true);
    console.log("New form Data....");
    console.log(formDataList);

    let numSucceeded = 0;
    let numFailed = 0;
    let errorMessages = "";
    const promises = [];
    for (const formData of formDataList) {
      const username = formData.username;
      //delete formData.username;
      const promise = this._data.createBucket(formData).then(data => {
        console.log(data.message);
        this.loading.hideSpinner();

        // Hide the add new form
        this.sideNav.hide(`itemDivId-${this.typeName}-New`);

        // Create and show the container with new type
        this.sideNav.addItemContainer({
          "type" : this.typeName,
          "id" : data.id,
          "hidden" : false
        });

        let form = document.createElement( this._getTypeClass() );
        form.init(this._data);

        this.sideNav.fillContainer({
          "type" : this.typeName,
          "id" : data.id,
          "itemContents" : form
        });

        // init form with the data
        formData.id = data.id;
        formData.organization = this.organizationId;
        form._init({ 
          "data": formData, 
          "modal" : this.modal, 
          "sidenav" : this.sideNav
        });

        // Add the item to navigation
        this._updateNavEvent("new", username, data.id);

        // Increment succeeded.
        numSucceeded++;
      }).catch((err) => {
        console.error(err);
        errorMessages = `${errorMessages}\n${err}`;
        numFailed++;
      });
      promises.push(promise);
    }

    // Let user know everything's all set!
    Promise.all(promises).then(() => {
      this.loading.hideSpinner();
      this._userData.reset();
      let message;
      if (numSucceeded > 0) {
        message = `Successfully created ${numSucceeded} buckets.`;
        if (numFailed > 0) {
          message = `${message} Failed to create ${numFailed}.\n${errorMessages}`;
        }
        return this._modalSuccess(message);
      } else {
        return this._modalError(`Failed to create ${numFailed} buckets.\n${errorMessages}`);
      }
    });
  }
}

customElements.define("bucket-edit", BucketEdit);
