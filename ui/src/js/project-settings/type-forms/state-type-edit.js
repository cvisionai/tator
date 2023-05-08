import { TypeFormTemplate } from "../components/type-form-template.js";
import { getCompiledList } from "../store.js";

export class StateTypeEdit extends TypeFormTemplate {
  constructor() {
    super();
    this.typeName = "StateType";
    this.readableTypeName = "State Type";
    this._hideAttributes = false;

    //
    var templateInner = document.getElementById("state-type-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("state-type-edit--form");
    this._editName = this._shadow.getElementById("state-type-edit--name");
    this._editDescription = this._shadow.getElementById(
      "state-type-edit--description"
    );
    this.dtypeSelect = this._shadow.getElementById(
      "state-type-edit--data-type"
    );
    this._visibleBool = this._shadow.getElementById("state-type-edit--visible");
    this._groupingDefault = this._shadow.getElementById(
      "state-type-edit--grouping-default"
    );
    this._mediaCheckboxes = this._shadow.getElementById(
      "state-type-edit--media"
    );
    this._association = this._shadow.getElementById(
      "state-type-edit--association"
    );
    this._interpolation = this._shadow.getElementById(
      "state-type-edit--interpolation"
    );
    this._deleteChildLoc = this._shadow.getElementById(
      "state-type-edit--delete-child"
    );

    // set enum values once
    this.dtypeSelect.choices = [{ label: "State", value: "state" }];

    this._association.choices = [
      { label: "Select", value: "" },
      { value: "Media" },
      { value: "Frame" },
      { value: "Localization" },
    ];

    this._interpolation.choices = [
      { label: "Select", value: "" },
      { label: "None", value: "none" },
      { label: "Latest", value: "latest" },
      { label: "Attr Style Range", value: "attr_style_range" },
    ];
  }

  async _setupFormUnique() {
    // dtype
    if (!this._data.dtype) {
      this.dtypeSelect._select.required = true;
      this.dtypeSelect.default = "";
    } else {
      this.dtypeSelect.setValue(this._data.dtype);
      this.dtypeSelect.default = this._data.dtype;
      this.dtypeSelect._select.disabled = true;
    }

    // description
    this._editDescription.setValue(this._data.description);
    this._editDescription.default = this._data.description;

    // visible
    this._visibleBool.setValue(this._data.visible);
    this._visibleBool.default = this._data.visible;

    // grouping default
    this._groupingDefault.setValue(this._data.grouping_default);
    this._groupingDefault.default = this._data.grouping_default;

    // const MEDIA = "Media";
    if (typeof this._data.media !== "undefined") {
      try {
        const mediaListWithChecked = await getCompiledList({
          type: "MediaType",
          check: this._data.media,
        });
        this._mediaCheckboxes.setValue(mediaListWithChecked);
        this._mediaCheckboxes.default = mediaListWithChecked;
      } catch (err) {
        console.error("Error populating media list.", err);
      }
    }

    // Associations
    if (!this._data.association) {
      this._association.default = "";
    } else {
      this._association.setValue(this._data.association);
      this._association.default = this._data.association;
    }

    // Interpolation
    if (!this._data.interpolation) {
      this._interpolation.default = "";
    } else {
      this._interpolation.setValue(this._data.interpolation);
      this._interpolation.default = this._data.interpolation;
    }

    // Child Localizations
    this._deleteChildLoc.setValue(this._data.delete_child_localizations);
    this._deleteChildLoc.default = this._data.delete_child_localizations;
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

    if (this._visibleBool.changed() || isNew) {
      formData.visible = this._visibleBool.getValue();
    }

    if (this._groupingDefault.changed() || isNew) {
      formData.grouping_default = this._groupingDefault.getValue();
    }

    if (this._mediaCheckboxes.changed() || isNew) {
      formData.media_types = this._mediaCheckboxes.getValue();
    }

    if (this._association.changed() || isNew) {
      formData.association = this._association.getValue();
    }

    if (this._interpolation.changed() || isNew) {
      formData.interpolation = this._interpolation.getValue();
    }

    if (this._deleteChildLoc.changed() || isNew) {
      formData.delete_child_localizations = this._deleteChildLoc.getValue();
    }

    return formData;
  }
}

customElements.define("state-type-edit", StateTypeEdit);
