import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";

export class BucketEdit extends OrgTypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Bucket";
    this.readableTypeName = "Bucket";
    this._hideAttributes = true;


    // 
    var templateInner = document.getElementById("bucket-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("bucket-edit--form");
    this._editName = this._shadow.getElementById("bucket-edit--name");
    this._editBucketType = this._shadow.getElementById("bucket-edit--bucket-type");
    this._editExternalHost = this._shadow.getElementById("bucket-edit--external-host");
    this._editArchiveSc = this._shadow.getElementById("bucket-edit--archive-storage-class");
    this._editLiveSc = this._shadow.getElementById("bucket-edit--live-storage-class");
    this._editGcsKeyInfo = this._shadow.getElementById("bucket-edit--gcs-key-info");
    this._editConfig = this._shadow.getElementById("bucket-edit--edit-config");

    // used to set up form
    this._currentBucketType = null;
    this._bucketFieldsByType = new Map();
    this._bucketFieldsByType.set("aws", ["access_key", "secret_key", "endpoint_url", "region", "archive_sc", "live_sc"])
      .set("gcs", ["archive_sc", "live_sc", "gcs_key_info"]);

    this._allFields = ["access_key", "secret_key", "endpoint_url", "region", "archive_sc", "live_sc", "gcs_key_info"];

    //
    this.bucketInputs = new Map();
    this.bucketInputs.set("secret_key", this._editSecretKey)
      .set("region", this._editRegion)
      .set("archive_sc", this._editArchiveSc)
      .set("live_sc", this._editLiveSc)
      .set("gcs_key_info", this._editGcsKeyInfo)
      .set("access_key", this._editAccessKey)
      .set("endpoint_url", this._editEndpointUrl);

    this._editBucketType.choices = [
      { name: "AWS", id: "AWS", checked: false },
      { name: "GCP", id: "GCP", checked: false },
      { name: "MINIO", id: "MINIO", checked: false },
      { name: "OCI", id: "OCI", checked: false },
    ];

    // archive storage class
    this._editArchiveSc.choices = [
      { name: "STANDARD", id: "STANDARD", checked: this.data.archive_sc == "STANDARD" },
      { name: "DEEP_ARCHIVE", id: "DEEP_ARCHIVE", checked: this.data.archive_sc == "DEEP_ARCHIVE" },
      { name: "COLDLINE", id: "COLDLINE", checked: this.data.archive_sc == "COLDLINE" }
    ];

    this._editLiveSc.choices = [
      { name: "STANDARD", id: "STANDARD", checked: true }
    ];
  }

  _ignoreConfigField() {
    return !(
      this._data.config
      && Object.keys(this._data.config).length === 0
      && this._data.config.constructor === Object
    )
  }

  async _setupFormUnique() {
    this._editBucketType.setValue(this._data.store_type);
    this._editBucketType.default = this._data.store_type;

    // name
    this._editName.setValue(this._data.name);
    this._editName.default = this._data.name;

    // external host
    this._editExternalHost.setValue(this.data.external_host);
    this._editExternalHost.default = this.data.external_host;

    // archive storage class
    this._editArchiveSc.setValue(this.data.archive_sc);
    this._editArchiveSc.default = this.data.archive_sc;

    // live storage class
    this._editLiveSc.setValue(this.data.live_sc);
    this._editLiveSc.default = this.data.live_s;

    // config
    this._editConfig.setValue(this.data.config);
    this._editConfig.default = this.data.config;
  }

  _getFormData() {
    let formData = {};
    const isNew = true; // schema doesn't accept nulls

    // Cannot edit bucket type after creation, so only consider isNew
    if (isNew) {
      formData.store_type = this._editBucketType.getValue();
    }

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editArchiveSc.changed() || isNew) {
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
