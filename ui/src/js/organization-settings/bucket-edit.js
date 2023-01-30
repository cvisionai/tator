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

    // 
    var templateInner = document.getElementById("bucket-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("bucket-edit--form");
    this._editName = this._shadow.getElementById("bucket-edit--name");
    this._editStoreType = this._shadow.getElementById("bucket-edit--bucket-type");
    this._editExternalHost = this._shadow.getElementById("bucket-edit--external-host");
    this._editArchiveSc = this._shadow.getElementById("bucket-edit--archive-storage-class");
    this._editLiveSc = this._shadow.getElementById("bucket-edit--live-storage-class");
    this._editConfig = this._shadow.getElementById("bucket-edit--config");

    //
    this.bucketInputs.set("store_type", this._editStoreType);
    this.bucketInputs.set("archive_sc", this._editArchiveSc);
    this.bucketInputs.set("live_sc", this._editLiveSc);
    this.bucketInputs.set("config", this._editConfig);
    this.bucketInputs.set("external_host", this._editExternalHost);


    this._editStoreType.choices = [
      { name: "AWS", value: "aws", checked: false },
      { name: "GCS", value: "gcs", checked: false },
      { name: "MINIO", id: "MINIO", checked: false },
      { name: "OCI", id: "OCI", checked: false }
    ];

    this._editArchiveSc.choices = [
      { name: "STANDARD", id: "STANDARD", checked: this._data.archive_sc == "STANDARD" },
      { name: "DEEP_ARCHIVE", id: "DEEP_ARCHIVE", checked: this._data.archive_sc == "DEEP_ARCHIVE" },
      { name: "COLDLINE", id: "COLDLINE", checked: this._data.archive_sc == "COLDLINE" }
    ];

    this._editLiveSc.choices = [
      { name: "STANDARD", id: "STANDARD", checked: true }
    ];

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
    if (this._data.id == "New") {
      this._editStoreType.setValue("");
      this._editStoreType.default ="";
    } else {
      this._editStoreType.setValue(this._data.store_type);
      this._editStoreType.default = this._data.store_type;
      this._editStoreType.hidden = true;
    }

    // external host
    this._editExternalHost.setValue(this._data.external_host);
    this._editExternalHost.default = this._data.external_host;
    this._editExternalHost.hidden = true;
    
    // archive storage class
    this._editArchiveSc.setValue(this._data.archive_sc);
    this._editArchiveSc.default = this._data.archive_sc;
    this._editArchiveSc.hidden = true;
    

    // live storage class
    this._editLiveSc.setValue(this._data.live_sc);
    this._editLiveSc.default = this._data.live_sc;
    this._editLiveSc.hidden = true;
   
    // config
    this._editConfig.setValue(this._data.config);
    this._editConfig.default = this._data.config;
    this._editConfig.hidden = true;
  }

  _getFormData() {
    let formData = {};
    const isNew = this._data.id == "New";

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
