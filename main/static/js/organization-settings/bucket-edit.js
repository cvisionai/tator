class BucketEdit extends OrganizationTypeForm {
  constructor() {
    super();
    this.typeName = "Bucket";
    this.readableTypeName = "Bucket";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" ><path d="M11 1c-4.908 0-7.998 1.592-7.79 2.95 0.060 0.389 0.225 1.945 0.434 3.273-2.405 0.934-3.202 2.449-3.095 3.684 0.127 1.461 1.441 3.025 4.328 3.295 1.648 0.154 3.631-0.75 4.916-2.295-0.122-0.207-0.193-0.45-0.193-0.707 0-0.774 0.627-1.4 1.4-1.4s1.4 0.627 1.4 1.4c0 0.762-0.61 1.381-1.369 1.398-1.529 1.973-3.858 3.164-6.064 3.025 0.051 0.324 0.070 0.947 0.096 1.113 0.090 0.579 2.347 2.26 5.937 2.264 3.59-0.004 5.847-1.685 5.938-2.263 0.088-0.577 1.641-11.409 1.852-12.787 0.208-1.358-2.883-2.95-7.79-2.95zM1.943 10.785c-0.055-0.643 0.455-1.498 1.924-2.139 0.211 1.34 0.441 2.797 0.643 4.074-1.604-0.313-2.498-1.149-2.567-1.935zM11 6.024c-3.59-0.002-6.137-1.334-6.137-1.832-0.002-0.494 2.547-1.79 6.137-1.788 3.59-0.002 6.139 1.294 6.137 1.788 0 0.498-2.547 1.83-6.137 1.832z"></path></svg>';
  
    // used to set up form
    this._currentBucketType = null;
    this.bucketInputs = new Map(); // setup later
    this._bucketFieldsByType = new Map();
    this._bucketFieldsByType.set("aws", ["access_key", "secret_key", "endpoint_url", "region", "archive_sc", "live_sc"]);
    this._bucketFieldsByType.set("gcs", ["archive_sc", "live_sc", "gcs_key_info"]);
    this._allFields = ["access_key", "secret_key", "endpoint_url", "region", "archive_sc", "live_sc", "gcs_key_info"];
  }

  init(data) {
    this._data = data;
  }

  _getEmptyData() {
    return {
      "id": `New`,
      "organization": this.organizationId,
      "name": "",
      "access_key": "",
      "secret_key": "",
      "endpoint_url": null,
      "region": "",
      "archive_sc": "",
      "live_sc": "",
      "gcs_key_info": null,
      "form": "empty"
    };
  }

  _getAttributeSection() {
    return document.createElement("div");
  }

  _getSectionForm(data = null) {
    this.data = data;
    console.log(this.data);

    let current = this.boxHelper.boxWrapDefault({
      "children": ""
    });

    //
    this._setForm();

    // name
    this._editName = document.createElement("text-input");
    this._editName.setAttribute("name", "Name");
    this._editName.setAttribute("type", "string");

    if (this.data.name == "+ Add new") {
      this._editName.setValue("");
      this._editName.default = ""; 
    } else {
      this._editName.setValue(this.data.name);
      this._editName.default = this.data.name; 
    }
    this._editName.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editName);

    // type
    if (this.data.id == "New") {
      let bucketTypes = [
        { name: "AWS", id: "aws", checked: false },
        { name: "GCS", id: "gcs", checked: false },
        //{name : "WASABI", id: "wasabi", checked: false}
      ];

      this._editBucketType = document.createElement("radio-set");
      this._editBucketType.setAttribute("name", "Bucket Type");
      this._editBucketType.setValue(bucketTypes);
      this._editBucketType.default = bucketTypes;
      this._form.appendChild(this._editBucketType);
      this._editBucketType.addEventListener("change", this._setBucketType.bind(this)); 
    } 


    // access key
    this._editAccessKey = document.createElement("text-input");
    this._editAccessKey.setAttribute("name", "Access Key");
    this._editAccessKey.setAttribute("type", "string");
    this._editAccessKey.setValue(this.data.access_key);
    this._editAccessKey.default = this.data.access_key;
    this._editAccessKey.hidden = true;
    this.bucketInputs.set("access_key", this._editAccessKey);
    this._editAccessKey.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editAccessKey);

    // secret key
    this._editSecretKey = document.createElement("text-input");
    this._editSecretKey.setAttribute("name", "Secret Key");
    this._editSecretKey.setAttribute("type", "password");
    this._editSecretKey.setValue(this.data.secret_key);
    this._editSecretKey.default = this.data.secret_key;
    this._editSecretKey.hidden = true;
    this.bucketInputs.set("secret_key", this._editSecretKey);
    this._editSecretKey.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editSecretKey);

    // endpoint url
    this._editEndpointUrl = document.createElement("text-input");
    this._editEndpointUrl.setAttribute("name", "Endpoint URL");
    this._editEndpointUrl.setAttribute("type", "string");
    this._editEndpointUrl.setValue(this.data.endpoint_url);
    this._editEndpointUrl.default = this.data.endpoint_url;
    this._editEndpointUrl.hidden = true;
    this.bucketInputs.set("endpoint_url", this._editEndpointUrl);
    this._editEndpointUrl.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editEndpointUrl);

    // region
    this._editRegion = document.createElement("text-input");
    this._editRegion.setAttribute("name", "Region");
    this._editRegion.setAttribute("type", "string");
    this._editRegion.setValue(this.data.region);
    this._editRegion.default = this.data.region;
    this._editRegion.hidden = true;
    this.bucketInputs.set("region", this._editRegion);
    this._editRegion.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editRegion);

    // archive storage class
    this._editArchiveSc = document.createElement("text-input");
    this._editArchiveSc.setAttribute("name", "Archive Storage Class");
    this._editArchiveSc.setAttribute("type", "string");
    this._editArchiveSc.setValue(this.data.archive_sc);
    this._editArchiveSc.default = this.data.archive_sc;
    this._editArchiveSc.hidden = true;
    this.bucketInputs.set("archive_sc", this._editArchiveSc);
    this._editArchiveSc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editArchiveSc);

    // live storage class
    this._editLiveSc = document.createElement("text-input");
    this._editLiveSc.setAttribute("name", "Live Storage Class");
    this._editLiveSc.setAttribute("type", "string");
    this._editLiveSc.setValue(this.data.live_sc);
    this._editLiveSc.default = this.data.live_sc;
    this._editLiveSc.hidden = true;
    this.bucketInputs.set("live_sc", this._editLiveSc);
    this._editLiveSc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editLiveSc);

    // GCS key info
    this._editGcsKeyInfo = document.createElement("text-area");
    this._editGcsKeyInfo.setAttribute("name", "GCS Key Info");
    this._editGcsKeyInfo.setAttribute("type", "json");
    this._editGcsKeyInfo.setValue(this.data.gcs_key_info);
    this._editGcsKeyInfo.default = this.data.gcs_key_info;
    this._editGcsKeyInfo.hidden = true;
    this.bucketInputs.set("gcs_key_info", this._editGcsKeyInfo);
    this._editGcsKeyInfo.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editGcsKeyInfo);

    if(data.id !== "New") {
      this._showBestGuess();
    }

    current.appendChild(this._form);

    return current;
  }

  _showBestGuess() {
    let hasGcsInfo = (this.data.gcs_key_info !== null);
    let hasAwsInfo = (this.data.region !== null || this.data.secret_key !== null || this.data.access_key !== null);

    if (hasGcsInfo && !hasAwsInfo) {
      this._showBucketFields("gcs");
    } else if (hasAwsInfo && !hasGcsInfo) {
      this._showBucketFields("aws");
    } else  { //if (hasGcsInfo && hasAwsInfo), or for some other reason
      for (let field of this._allFields) {
        this._currentBucketType = "none";
        this.bucketInputs.get(field).hidden = false;
      }
    }
  }

  _setBucketType() {
    let type = this._editBucketType.getValue();
    this._showBucketFields(type);
  }

  _showBucketFields(type) {
    this._currentBucketType = type;
    let hideType = type == "aws" ? "gcs" : "aws";
    
    // hide non-relevent fields
    // #todo expand to loops list of hideTypes if we have > 2 (ie. Wasabi)
    for (let field of this._bucketFieldsByType.get(hideType)) {
      // console.log(this.bucketInputs.get(field));
      this.bucketInputs.get(field).hidden = true;
    }
    
    // show relevent fields
    for (let field of this._bucketFieldsByType.get(type)) {
      // console.log(this.bucketInputs.get(field));
      this.bucketInputs.get(field).hidden = false;
    }
  }

  _getFormData(id) {
    let formData = {};
    let bucketType = this._currentBucketType !== null ? this._currentBucketType : "none";
    // const isNew = this.data.id == "New" ? true : false;
    const isNew = true; // schema doesn't accept nulls

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editAccessKey.changed() && bucketType !== "gcs") {
      formData.access_key = this._editAccessKey.getValue();
    }

    if (this._editSecretKey.changed() && bucketType !== "gcs") {
      formData.secret_key = this._editSecretKey.getValue();
    }

    if (this._editEndpointUrl.changed() && bucketType !== "gcs") {
      formData.endpoint_url = this._editEndpointUrl.getValue();
    }

    if (this._editRegion.changed() && bucketType !== "gcs") {
      formData.region = this._editRegion.getValue();
    }

    if (this._editArchiveSc.changed() || isNew)  {
      formData.archive_sc = this._editArchiveSc.getValue();
    }

    if (this._editLiveSc.changed()  || isNew) {
      formData.live_sc = this._editLiveSc.getValue();
    }

    if (this._editGcsKeyInfo.changed() && bucketType !== "aws") {
      formData.gcs_key_info = this._editGcsKeyInfo.getValue();
    }

    return formData;
  }
}

customElements.define("bucket-edit", BucketEdit);
