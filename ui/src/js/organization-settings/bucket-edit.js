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
    this._editStoreType = this._shadow.getElementById(
      "bucket-edit--store-type"
    );
    this._editExternalHost = this._shadow.getElementById(
      "bucket-edit--external-host"
    );
    this._editArchiveScDefault = this._shadow.getElementById(
      "bucket-edit--archive-storage-class-default"
    );
    this._editArchiveScAws = this._shadow.getElementById(
      "bucket-edit--archive-storage-class-aws"
    );
    this._editArchiveScGcs = this._shadow.getElementById(
      "bucket-edit--archive-storage-class-gcs"
    );
    this._editLiveSc = this._shadow.getElementById(
      "bucket-edit--live-storage-class"
    );
    this._editConfig = this._shadow.getElementById("bucket-edit--config");

    this._editStoreType.choices = [
      { name: "AWS S3", value: "AWS", checked: false },
      { name: "Google Cloud Storage", value: "GCP", checked: false },
      { name: "Minio", value: "MINIO", checked: false },
      { name: "Oracle Cloud Storage", value: "OCI", checked: false },
    ];

    // archive storage class
    this._editArchiveScDefault.choices = [
      { name: "Standard", value: "STANDARD", checked: true },
    ];
    this._editArchiveScAws.choices = [
      { name: "Standard", value: "STANDARD", checked: true },
      { name: "Deep Archive", value: "DEEP_ARCHIVE", checked: false },
    ];
    this._editArchiveScGcs.choices = [
      { name: "Standard", value: "STANDARD", checked: true },
      { name: "Coldline", value: "COLDLINE", checked: false },
    ];

    this._editLiveSc.choices = [
      { name: "Standard", value: "STANDARD", checked: true },
    ];
  }

  _showArchiveScField() {
    const storeType = this._editStoreType.getValue();

    switch (storeType) {
      case "AWS":
        this._editArchiveScDefault.hidden = true;
        this._editArchiveScAws.hidden = false;
        this._editArchiveScGcs.hidden = true;
        this._editArchiveSc = this._editArchiveScAws;
        break;
      case "GCP":
        this._editArchiveScDefault.hidden = true;
        this._editArchiveScAws.hidden = true;
        this._editArchiveScGcs.hidden = false;
        this._editArchiveSc = this._editArchiveScGcs;
        break;
      case "MINIO":
      case "OCI":
        this._editArchiveScDefault.hidden = false;
        this._editArchiveScAws.hidden = true;
        this._editArchiveScGcs.hidden = true;
        this._editArchiveSc = this._editArchiveScDefault;
        break;
    }
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
      this._editStoreType.setValue("MINIO");
      this._editStoreType.default = "MINIO";
      this._editStoreType.hidden = false;
    } else {
      // type cannot be changed after bucket creation, so hide this field
      this._editStoreType.setValue(this._data.store_type);
      this._editStoreType.default = this._data.store_type;
      this._editStoreType.hidden = true;
    }
    this._editStoreType.addEventListener(
      "change",
      this._showArchiveScField.bind(this)
    );

    // external host
    if (this._data.id == "New") {
      this._editExternalHost.setValue("");
      this._editExternalHost.default = "";
    } else {
      this._editExternalHost.setValue(this._data.external_host);
      this._editExternalHost.default = this._data.external_host;
    }

    // archive storage class
    this._showArchiveScField();
    if (this._data.id == "New") {
      this._editArchiveSc.setValue("STANDARD");
      this._editArchiveSc.default = "STANDARD";
    } else {
      this._editArchiveSc.setValue(this._data.archive_sc);
      this._editArchiveSc.default = this._data.archive_sc;
    }

    // live storage class
    if (this._data.id == "New") {
      this._editLiveSc.setValue("STANDARD");
      this._editLiveSc.default = "STANDARD";
    } else {
      this._editLiveSc.setValue(this._data.live_sc);
      this._editLiveSc.default = this._data.live_sc;
    }

    // config
    this._editConfig.setValue("");
    this._editConfig.default = "";
  }

  _getFormData() {
    let formData = {};
    const isNew = this._data.id == "New";

    // Cannot edit bucket type after creation, so only consider if isNew
    if (isNew) {
      formData.store_type = this._editStoreType.getValue();
    }

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    let archiveSc;
    switch (this._editStoreType.getValue()) {
      case "AWS":
        archiveSc = this._editArchiveScAws;
        break;
      case "GCP":
        archiveSc = this._editArchiveScGcs;
        break;
      case "MINIO":
      case "OCI":
        archiveSc = this._editArchiveScDefault;
        break;
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
      const externalHost = this._editExternalHost.getValue();
      if (externalHost) {
        formData.external_host = externalHost;
      }
    }

    return formData;
  }
}

customElements.define("bucket-edit", BucketEdit);
