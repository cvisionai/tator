import { TypeForm } from "./type-form.js";

export class MediaTypeMainEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "MediaType";
    this.readableTypeName = "Media Type";
    
    // 
    var templateInner = document.getElementById("media-type-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this.typeFormDiv.appendChild(innerClone);

    this._form = this._shadow.getElementById("media-type-edit--form");
    this._editName = this._shadow.getElementById("media-type-edit--name");
    this.dtypeSelect = this._shadow.getElementById("media-type-edit--data-type");  
    this._editDescription = this._shadow.getElementById("media-type-edit--description");
    this._volumeDiv = this._shadow.getElementById("media-type-edit--volume-div");
    this._defaultVolume = this._shadow.getElementById("media-type-edit--volume");
    this._visibleBool = this._shadow.getElementById("media-type-edit--visible");    
  }

  async setupForm(data) {
    this.data = data;

    // Setup view
    this._typeId = data.id;
    this._objectName = data.name;
    this._projectId = data.project;

    // name
    let  name  = ""
    if (data.id !== "New") name = this.data.name
    
    // append input for name
    this._editName.setValue(name);
    this._editName.default = name;

    // dtype
    const dTypeOptions = [
      { "label": "Select", "value": "" },
      { "label": "Video", "value": "video" },
      { "label": "Image", "value": "image" },
      { "label": "Multiview", "value": "multi" }
    ];
    // Emptyform uses "" for dtype value
    this.dtypeSelect.choices = dTypeOptions;
    if (!data.dtype) {
      this.dtypeSelect._select.required = true;
      this.dtypeSelect.default = "";
    } else {
      this.dtypeSelect.setValue(data.dtype);
      this.dtypeSelect.default = data.dtype;
      this.dtypeSelect._select.disabled = true;
    }
    
    // description
    this._editDescription.setValue(this.data.description);
    this._editDescription.default = this.data.description;

    // default volume (video, multi)
    this._volumeDiv.hidden = (typeof data.dtype !== "undefined" && data.dtype === "image") || data.dtype == "";
    const defaultVol = typeof this.data.default_volume !== "undefined" ? this.data.default_volume : 0;
    this._defaultVolume.setValue(defaultVol);
    this._defaultVolume.default = defaultVol;

    // visible
    this._visibleBool.setValue(this.data.visible);
    this._visibleBool.default = this.data.visible;
  }

  _showHideVolume(evt) {
    const chosenDtype = evt.target.getValue();
    this._volumeDiv.hidden = !(chosenDtype == "multi" || chosenDtype == "video");
  }

  _getFormData() {
    const formData = {};
    const isNew = this.data.id == "New" ? true : false;
    
    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this.dtypeSelect.changed() || isNew) {
      formData.dtype = this.dtypeSelect.getValue();
    }

    if (this._editDescription.changed() || isNew) {
      formData.description = this._editDescription.getValue();
    }

    if ((this._defaultVolume.changed() || isNew) && this.dtypeSelect.getValue() !== "image") {
      formData.default_volume = Number(this._defaultVolume.getValue());
    }

    if (this._visibleBool.changed() || isNew) {
      formData.visible = this._visibleBool.getValue();
    }

    return formData;
  }


}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
