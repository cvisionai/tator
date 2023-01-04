import { OrganizationTypeForm } from "./organization-type-form.js";

export class BucketEdit extends OrganizationTypeForm {
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

  _getAttributeSection() {
    return document.createElement("div");
  }

  _getSectionForm(data = null) {
    this.data = data;
    console.log(this.data);

    let current = document.createElement("div");
    current.setAttribute("class", `py-3 rounded-2 edit-project__config`);

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
    this._editArchiveSc = document.createElement("text-input");
    this._editArchiveSc.setAttribute("name", "Archive Storage Class");
    this._editArchiveSc.setAttribute("type", "string");
    // if (this.data.id == "New") {
    //   this._editArchiveSc.setValue("STANDARD");
    //   this._editArchiveSc.default = "STANDARD";
    // } else {
    this._editArchiveSc.setValue(this.data.archive_sc);
    this._editArchiveSc.default = this.data.archive_sc;
    // }
    this._editArchiveSc.hidden = false;
    this._editArchiveSc.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editArchiveSc);

    // live storage class
    this._editLiveSc = document.createElement("text-input");
    this._editLiveSc.setAttribute("name", "Live Storage Class");
    this._editLiveSc.setAttribute("type", "string");
    // if (this.data.id == "New") {
    //   this._editLiveSc.setValue("STANDARD");
    //   this._editLiveSc.default = "STANDARD";
    // } else {
    this._editLiveSc.setValue(this.data.live_sc);
    this._editLiveSc.default = this.data.live_sc;
    // }
    this._editLiveSc.hidden = false;
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
      formData.config = JSON.parse(this._editConfig.getValue());
    }

    if (this._editBucketType.changed() || isNew) {
      formData.store_type = this._editBucketType.getValue();
    }

    if (this._editExternalHost.changed() || isNew) {
      formData.external_host = this._editExternalHost.getValue();
    }

    return formData;
  }
}

customElements.define("bucket-edit", BucketEdit);
