import { TypeForm } from "./type-form.js";

export class MediaTypeMainEdit extends TypeForm {
  constructor() {
    super();
    this.typeName = "MediaType";
    this.readableTypeName = "Media Type";
    this.icon = '<svg class="SideNav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="18" viewBox="0 0 12 16"><path fill-rule="evenodd" d="M6 5h2v2H6V5zm6-.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v11l3-5 2 4 2-2 3 3V5z"/></svg>';
  }

  _getSectionForm(data){
    let current = this.boxHelper.boxWrapDefault( {
        "children" : ""
      } );

    //
    this._setForm();

    // append input for name
    this._editName = document.createElement("text-input");
    this._editName.setAttribute("name", "Name");
    this._editName.setAttribute("type", "string");
    this._editName.setValue(this.data.name);
    this._editName.default = this.data.name;
    this._editName.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editName);

    // dtype
    const dTypeOptions = [
      { "label": "Select", "value": "" },
      { "label": "Video", "value": "video" },
      { "label": "Image", "value": "image" },
      { "label": "Multiview", "value": "multi" }
    ];
    // Emptyform uses "" for dtype value
    this.dtypeSelect = document.createElement("enum-input");
    this.dtypeSelect.setAttribute("name", "Data Type");
    this.dtypeSelect.choices = dTypeOptions;
    if (!data.dtype) {
      this.dtypeSelect._select.required = true;
      this.dtypeSelect.default = "";
      this.dtypeSelect.addEventListener("change", this._formChanged.bind(this));
    } else {
      this.dtypeSelect.setValue(data.dtype);
      this.dtypeSelect.default = data.dtype;
      this.dtypeSelect._select.disabled = true;
    }
    this._form.appendChild(this.dtypeSelect);
    
    // description
    this._editDescription = document.createElement("text-input");
    this._editDescription.setAttribute("name", "Description");
    this._editDescription.setAttribute("type", "string");
    this._editDescription.setValue(this.data.description);
    this._editDescription.default = this.data.description;
    this._editDescription.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._editDescription);

    // default volume (video, multi)
    this._volumeDiv = document.createElement("div");
    this._volumeDiv.hidden = (typeof data.dtype !== "undefined" && data.dtype === "image") || data.dtype == "";
    this._form.appendChild(this._volumeDiv);

    const defaultVol = typeof this.data.default_volume !== "undefined" ? this.data.default_volume : 0;
    this._defaultVolume = document.createElement("text-input");
    this._defaultVolume.setAttribute("name", "Default volume");
    this._defaultVolume.setAttribute("type", "number");
    this._defaultVolume.setValue(defaultVol);
    this._defaultVolume.default = defaultVol;
    this._defaultVolume.addEventListener("change", this._formChanged.bind(this));
    this._volumeDiv.appendChild(this._defaultVolume);

    const infoDefaultVol = document.createElement("div");
    infoDefaultVol.setAttribute("class", "col-8 float-right f3 text-gray");
    infoDefaultVol.innerText = "Note: Range from 0 (no sound) to 100.";
    this._volumeDiv.appendChild(infoDefaultVol);

    // visible
    this._visibleBool = document.createElement("bool-input");
    this._visibleBool.setAttribute("name", "Visible");
    this._visibleBool.setAttribute("on-text", "Yes");
    this._visibleBool.setAttribute("off-text", "No");
    this._visibleBool.setValue(this.data.visible);
    this._visibleBool.default = this.data.visible;
    this._visibleBool.addEventListener("change", this._formChanged.bind(this));
    this._form.appendChild(this._visibleBool);

    current.appendChild(this._form);

    this.dtypeSelect.addEventListener("change", this._showHideVolume.bind(this));

    return current;
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
