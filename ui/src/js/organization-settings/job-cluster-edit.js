import { OrgTypeFormTemplate } from "./components/org-type-form-template.js";

export class JobClusterEdit extends OrgTypeFormTemplate {
  constructor() {
    super();
    this.typeName = "JobCluster";
    this.readableTypeName = "Job Cluster";
    this._hideAttributes = true;

    //
    var templateInner = document.getElementById("job-cluster-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("job-cluster-edit--form");
    this._editName = this._shadow.getElementById("job-cluster-edit--name");
    this._editHost = this._shadow.getElementById("job-cluster-edit--host");
    this._editPort = this._shadow.getElementById("job-cluster-edit--port");
    this._editToken = this._shadow.getElementById("job-cluster-edit--token");
    this._editCert = this._shadow.getElementById("job-cluster-edit--cert");
  }

  async _setupFormUnique() {
    // name
    let name = this._data.id === "New" ? "" : this._data.name;
    this._editName.setValue(name);
    this._editName.default = name;

    // host
    this._editHost.setValue(this._data.host);
    this._editHost.default = this._data.host;

    // port
    this._editPort.setValue(this._data.port);
    this._editPort.default = this._data.port;

    // token
    this._editToken.setValue(this._data.token);
    this._editToken.default = this._data.token;

    // cert
    this._editCert.setValue(this._data.cert);
    this._editCert.default = this._data.cert;
  }

  // save and formdata
  _getFormData() {
    let formData = {};
    const isNew = true; // schema doesn't accept nulls

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editHost.changed() || isNew) {
      formData.host = this._editHost.getValue();
    }

    if (this._editPort.changed() || isNew) {
      formData.port = this._editPort.getValue();
    }

    if (this._editToken.changed() || isNew) {
      formData.token = this._editToken.getValue();
    }

    if (this._editCert.changed() || isNew) {
      formData.cert = this._editCert.getValue();
    }

    return formData;
  }
}

customElements.define("job-cluster-edit", JobClusterEdit);
