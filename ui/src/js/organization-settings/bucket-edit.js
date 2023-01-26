import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";

export class BucketEdit extends OrgTypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Bucket";
    this.readableTypeName = "Bucket";
    this._hideAttributes = true;
  
    // used to set up form
    this._currentBucketType = null;
    this.bucketInputs = new Map(); // setup later
    this._bucketFieldsByType = new Map();
    this._bucketFieldsByType.set("aws", ["access_key", "secret_key", "endpoint_url", "region", "archive_sc", "live_sc"]);
    this._bucketFieldsByType.set("gcs", ["archive_sc", "live_sc", "gcs_key_info"]);
    this._allFields = ["access_key", "secret_key", "endpoint_url", "region", "archive_sc", "live_sc", "gcs_key_info"];   

    // 
    var templateInner = document.getElementById("bucket-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("bucket-edit--form");
    this._editName = this._shadow.getElementById("bucket-edit--name");
    this._editBucketType = this._shadow.getElementById("bucket-edit--bucket-type");
    this._editAccessKey = this._shadow.getElementById("bucket-edit--access-key");
    this._editSecretKey = this._shadow.getElementById("bucket-edit--secret-key");
    this._editEndpointUrl = this._shadow.getElementById("bucket-edit--endpoint-url");
    this._editRegion = this._shadow.getElementById("bucket-edit--region");
    this._editArchiveSc = this._shadow.getElementById("bucket-edit--archive-storage-class");
    this._editLiveSc = this._shadow.getElementById("bucket-edit--live-storage-class");
    this._editGcsKeyInfo = this._shadow.getElementById("bucket-edit--gcs-key-info");

    //
    this.bucketInputs.set("secret_key", this._editSecretKey);
    this.bucketInputs.set("region", this._editRegion);
    this.bucketInputs.set("archive_sc", this._editArchiveSc);
    this.bucketInputs.set("live_sc", this._editLiveSc);
    this.bucketInputs.set("gcs_key_info", this._editGcsKeyInfo);
    this.bucketInputs.set("access_key", this._editAccessKey);
    this.bucketInputs.set("endpoint_url", this._editEndpointUrl);

    _getEmptyData() {
      return {
        "id": `New`,
        "organization": this.organizationId,
        "name": "",
        "store_type": null,
        "external_host": null,
        "archive_sc": "STANDARD",
        "live_sc": "STANDARD",
        "config": null,
        "form": "empty"
      };
    }

    this._editBucketType.choices = [
      { name: "AWS", value: "aws", checked: false },
      { name: "GCS", value: "gcs", checked: false },
    ];

  _getSectionForm(data = null) {
    this.data = data;
    console.log(this.data);

    let current = document.createElement("div");
    current.setAttribute("class", `py-3 rounded-2 edit-project__config`);

    //
    this._setForm();
  }
  
  _ignoreConfigField() {
    return !(
      this._data.config
      && Object.keys(this._data.config).length === 0
      && this._data.config.constructor === Object
    )
  }

  async _setupFormUnique() {
    // name
    if (this._data.id === "New") {
      this._editName.setValue("");
      this._editName.default = ""; 
    } else {
      this._editName.setValue(this._data.name);
      this._editName.default = this._data.name; 
    }

    // type
    /* Hugh's changes, commented for now
    if (this.data.id == "New") {
      let bucketTypes = [
        { name: "AWS", id: "AWS", checked: false },
        { name: "GCP", id: "GCP", checked: false },
        { name: "MINIO", id: "MINIO", checked: false },
        { name: "OCI", id: "OCI", checked: false },
      ];

      this._editBucketType = document.createElement("radio-set");
      this._editBucketType.setAttribute("name", "Bucket Type");
      this._editBucketType.setValue(bucketTypes);
      this._editBucketType.default = bucketTypes;
      this._form.appendChild(this._editBucketType);
    } 

    // external host
    this._editExternalHost = document.createElement("text-input");
    this._editExternalHost.setAttribute("name", "External Host");
    this._editExternalHost.setAttribute("type", "string");
    this._editExternalHost.setValue(this.data.external_host);
    this._editExternalHost.default = this.data.external_host;
    this._editExternalHost.hidden = false;
    this._editExternalHost.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editExternalHost);

    // archive storage class
    let archiveScTypes = [
      { name: "STANDARD", id: "STANDARD", checked: this.data.archive_sc == "STANDARD" },
      { name: "DEEP_ARCHIVE", id: "DEEP_ARCHIVE", checked: this.data.archive_sc == "DEEP_ARCHIVE" },
      { name: "COLDLINE", id: "COLDLINE", checked: this.data.archive_sc == "COLDLINE" }
    ];

    this._editArchiveSc = document.createElement("radio-set");
    this._editArchiveSc.setAttribute("name", "Archive Storage Class");
    this._editArchiveSc.setValue(archiveScTypes);
    this._editArchiveSc.default = archiveScTypes;
    this._editArchiveSc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editArchiveSc);

    // live storage class
    let liveScTypes = [
      { name: "STANDARD", id: "STANDARD", checked: true }
    ];

    this._editLiveSc = document.createElement("radio-set");
    this._editLiveSc.setAttribute("name", "Live Storage Class");
    this._editLiveSc.setValue(liveScTypes);
    this._editLiveSc.default = liveScTypes;
    this._editLiveSc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editLiveSc);

    // config
    this._editConfig = document.createElement("text-area");
    this._editConfig.setAttribute("name", "Config");
    this._editConfig.setAttribute("type", "json");
    this._editConfig.setValue("");
    this._editConfig.default = "";
    this._editConfig.hidden = false;
    this._editConfig.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editConfig);

    current.appendChild(this._form);
    return current;
  }

  _getFormData(id) {
    let formData = {};
    const isNew = this.data.id == "New";
  End Hugh's changes
  */
    if (this._data.id == "New") {
      this._editBucketType.setValue("");
      this._editBucketType.default ="";
      this._editBucketType.addEventListener("change", this._setBucketType.bind(this));
    }


    // archive storage class
    this._editArchiveSc.setValue(this._data.archive_sc);
    this._editArchiveSc.default = this._data.archive_sc;
    this._editArchiveSc.hidden = true;
    

    // live storage class
    this._editLiveSc.setValue(this._data.live_sc);
    this._editLiveSc.default = this._data.live_sc;
    this._editLiveSc.hidden = true;

    if (this._data.id !== "New") this._showBestGuess();
  }

  _showBestGuess() {
    let hasGcsInfo = (this._data.gcs_key_info && this._data.gcs_key_info !== null);
    let hasAwsInfo = (this._data.store_type == "AWS");

    if (hasGcsInfo) {
      this._showBucketFields("gcs");
    } else if (hasAwsInfo) {
      this._showBucketFields("aws");
    } else  { //if (hasGcsInfo && hasAwsInfo), or for some other reason
      this._currentBucketType = "none";
      for (let field of this._allFields) {
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
    this._editBucketType.setValue(type);
    
    // hide non-relevent fields
    // #todo expand to loops list of hideTypes if we have > 2 (ie. Wasabi)
    const hideThese = this._bucketFieldsByType.get(hideType);
    for (let field of hideThese) {
      this.bucketInputs.get(field).hidden = true;
    }
    
    // show relevent fields
    const showThese = this._bucketFieldsByType.get(type);
    for (let field of showThese) {
      this.bucketInputs.get(field).hidden = false;
    }
  }

  _getFormData() {
    let formData = {};
    let bucketType = this._currentBucketType !== null ? this._currentBucketType : "none";
    const isNew = true; // schema doesn't accept nulls

    // Cannot edit bucket type after creation, so only consider isNew
    if (isNew) {
      formData.store_type = this._editBucketType.getValue();
    }

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editArchiveSc.changed() || isNew)  {
      formData.archive_sc = this._editArchiveSc.getValue();
    }

    if (this._editLiveSc.changed() || isNew) {
      formData.live_sc = this._editLiveSc.getValue();
    }

    if (this._editConfig.changed() || isNew) {
      const newConfig = JSON.parse(this._editConfig.getValue());
      if (newConfig != null) {
        formData.config = newConfig;
      }
    }

    if (this._editExternalHost.changed() || isNew) {
      formData.external_host = this._editExternalHost.getValue();
    }

    return formData;
  }
}

customElements.define("bucket-edit", BucketEdit);
