import { TypeFormTemplate } from "../components/type-form-template.js";

export class MediaTypeEdit extends TypeFormTemplate {
  constructor() {
    super();
    this.typeName = "MediaType";
    this.readableTypeName = "Media Type";
    this._hideAttributes = false;

    //
    var templateInner = document.getElementById("media-type-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("media-type-edit--form");
    this._editName = this._shadow.getElementById("media-type-edit--name");
    this.dtypeSelect = this._shadow.getElementById(
      "media-type-edit--data-type"
    );
    this._editDescription = this._shadow.getElementById(
      "media-type-edit--description"
    );
    this._volumeDiv = this._shadow.getElementById(
      "media-type-edit--volume-div"
    );
    this._defaultVolume = this._shadow.getElementById(
      "media-type-edit--volume"
    );
    this._visibleBool = this._shadow.getElementById("media-type-edit--visible");

    this.dtypeSelect.addEventListener(
      "change",
      this._showHideVolume.bind(this)
    );

    // Set enum value once
    this.dtypeSelect.choices = [
      { label: "Select", value: "" },
      { label: "Video", value: "video" },
      { label: "Image", value: "image" },
      { label: "Multiview Video", value: "multi" },
      { label: "Multiview Images", value: "multi-image" },
    ];
  }

  async _setupFormUnique() {
    // dtype
    if (!this._data.dtype) {
      this.dtypeSelect.setValue("");
      this.dtypeSelect._select.required = true;
      this.dtypeSelect.default = "";
      this.dtypeSelect._select.removeAttribute("disabled");
    } else {
      this.dtypeSelect.setValue(this._data.dtype);
      this.dtypeSelect.default = this._data.dtype;
      this.dtypeSelect._select.disabled = true;
    }

    // description
    this._editDescription.setValue(this._data.description);
    this._editDescription.default = this._data.description;

    // default volume (video, multi)
    this._volumeDiv.hidden = !(
      this._data.dtype === "video" || this._data.dtype === "multi"
    );

    const defaultVol = this._data.default_volume;
    this._defaultVolume.setValue(defaultVol);
    this._defaultVolume.default = defaultVol;

    // visible
    this._visibleBool.setValue(this._data.visible);
    this._visibleBool.default = this._data.visible;
  }

  _showHideVolume(evt) {
    const chosenDtype = evt.target.getValue();
    this._volumeDiv.hidden = !(
      chosenDtype == "multi" || chosenDtype == "video"
    );
  }

  _getFormData() {
    const formData = {};
    const isNew = this._data.id == "New" ? true : false;

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this.dtypeSelect.changed() || isNew) {
      formData.dtype = this.dtypeSelect.getValue();
    }

    if (this._editDescription.changed() || isNew) {
      formData.description = this._editDescription.getValue();
    }

    if (
      (this._defaultVolume.changed() || isNew) &&
      this.dtypeSelect.getValue() !== "image"
    ) {
      formData.default_volume = Number(this._defaultVolume.getValue());
    }

    if (this._visibleBool.changed() || isNew) {
      formData.visible = this._visibleBool.getValue();
    }

    return formData;
  }
}

customElements.define("media-type-edit", MediaTypeEdit);
