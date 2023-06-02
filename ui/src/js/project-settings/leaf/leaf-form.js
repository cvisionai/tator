import { TatorElement } from "../../components/tator-element.js";

export class LeafForm extends TatorElement {
  constructor() {
    super();

    // Flag values
    this._changed = false;
    this._fromType = null;

    //
    this._data = {};
    this.widgets = [];
  }

  set fromType(val) {
    this._fromType = val;
  }

  set changed(val) {
    this.dispatchEvent(new Event("change"));
    return (this._changed = val);
  }

  isChanged() {
    return this._changed;
  }

  changeReset() {
    return (this._changed = false);
  }

  _initEmptyForm(leaves, name, attributeTypes, deleteIcon) {
    const form = document.createElement("form");
    this.form = form;
    this.projectName = name;

    this.form.addEventListener("change", this._formChanged.bind(this));

    // Fields for this form
    // name
    this._name = document.createElement("text-input");
    this._name.setAttribute("name", "Name");
    this._name.setAttribute("type", "string");
    this._name.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._name);

    // READ ONLY : path
    this._path = document.createElement("text-input");
    this._path.setAttribute("name", "Path");
    this._path.permission = "View Only";
    this._path.default = "";
    this._path.setAttribute("type", "string");
    this._path.addEventListener("change", this._formChanged.bind(this));
    this.form.appendChild(this._path);

    // Choices for Parent
    let choices = [];
    choices.push({ value: null, label: "None" });

    if (typeof leaves == "string" && leaves !== "") {
      leaves = [];
    } else if (Array.isArray(leaves)) {
      const leafChoices = leaves.map((leaf) => {
        let space = "";
        for (let i = 0; i < leaf.indent; i++) {
          space += "-";
        }
        return {
          value: leaf.id,
          label: space + leaf.name,
        };
      });
      choices = [...choices, ...leafChoices];
    }

    this._parentLeaf = document.createElement("enum-input");
    this._parentLeaf.setAttribute("name", "Parent");
    // this._parentLeaf.permission = "View Only";
    this._parentLeaf.choices = choices;
    this.form.appendChild(this._parentLeaf);

    // Custom attribute panel
    const sorted = attributeTypes.sort((a, b) => {
      return a.order - b.order || a.name - b.name;
    });

    for (let column of sorted) {
      let widget = this._getUserDefinedWidget(column);
      this.widgets.push(widget);
      this.form.appendChild(widget);
    }

    this._shadow.appendChild(this.form);

    return this.form;
  }

  _getUserDefinedWidget(column) {
    var ignorePermission = false;
    let widget;
    if (column.dtype == "bool") {
      widget = document.createElement("bool-input");
      widget.setAttribute("name", column.name);
      widget.setAttribute("on-text", "Yes");
      widget.setAttribute("off-text", "No");
    } else if (column.dtype == "enum") {
      widget = document.createElement("enum-input");
      widget.setAttribute("name", column.name);
      let choices = [];
      for (let idx = 0; idx < column.choices.length; idx++) {
        let choice = { value: column.choices[idx] };
        if (column.labels) {
          choice.label = column.labels[idx];
        }
        choices.push(choice);
      }
      widget.choices = choices;
    } else if (column.dtype == "datetime") {
      try {
        widget = document.createElement("datetime-input");
        widget.setAttribute("name", column.name);
      } catch (e) {
        console.error(e.description);
      }

      if (
        (widget && widget._input && widget._input.type == "text") ||
        !widget._input
      ) {
        widget = document.createElement("text-input");
        widget.setAttribute("name", column.name);
        widget.setAttribute("type", column.dtype);
        widget.autocomplete = column.autocomplete;
      }
      //widget.autocomplete = column.autocomplete; #TODO can this use autocomplete?
      if (column.style) {
        const style_options = column.style.split(" ");
        if (style_options.includes("disabled")) {
          widget.permission = "View Only";
          widget.disabled = true;
          ignorePermission = true;
        }
      }
    } else if (column.style) {
      const style_options = column.style.split(" ");
      if (column.dtype == "string" && style_options.includes("long_string")) {
        widget = document.createElement("text-area");
        widget.setAttribute("name", column.name);
        widget.setAttribute("type", column.dtype);
      } else {
        widget = document.createElement("text-input");
        widget.setAttribute("name", column.name);
        widget.setAttribute("type", column.dtype);
        widget.autocomplete = column.autocomplete;
      }

      if (style_options.includes("disabled")) {
        widget.permission = "View Only";
        widget.disabled = true;
        ignorePermission = true;
      }
    } else {
      // TODO: Implement a better geopos widget
      widget = document.createElement("text-input");
      widget.setAttribute("name", column.name);
      widget.setAttribute("type", column.dtype);
      widget.autocomplete = column.autocomplete;
    }

    // Set whether this widget is required
    if (typeof column.required === "undefined") {
      widget.required = false;
    } else {
      widget.required = column.required;
    }

    // Show description hover text (if existing)
    if (
      typeof column.description !== "undefined" &&
      column.description !== ""
    ) {
      widget.setAttribute("title", column.description);
    } //else {
    //widget.setAttribute("title", `Accepts "${column.dtype}" data input`);
    //}

    if (typeof this._permission !== "undefined" && !ignorePermission) {
      widget.permission = this._permission;
    }

    if (column.default) {
      widget.default = column.default;
    }
    widget.reset();

    widget.addEventListener("change", () => {
      if (this._emitChanges) {
        this.dispatchEvent(new Event("change"));
      }
    });

    return widget;
  }

  _formChanged() {
    this.changed = true;
    return this.form.classList.add("changed");
  }

  _getFormWithValues(leaves, leaf, attributeTypes, deleteIcon) {
    const {
      clone = false,
      name = null,
      path = null,
      parent = null,
      attributes = {},
      projectName = "",
    } = leaf;

    this._data = leaf;

    // do we want to save all the data shown
    this.isClone = clone;

    // gets leaf object as param destructured over these values
    //sets value on THIS form
    this.form = this._initEmptyForm(
      leaves,
      projectName,
      attributeTypes,
      deleteIcon
    );

    /* fields that are always available */
    // Set Name
    this._name.default = name;
    this._name.setValue(name);

    // Set path
    this._path.default = path;
    this._path.setValue(path);

    // Set parent
    const parentValue = parent == null ? "null" : Number(parent);
    this._parentLeaf.default = parentValue;
    this._parentLeaf.setValue(parentValue);

    //
    for (const widget of this.widgets) {
      const name = widget.getAttribute("name");
      const value = attributes[name];
      // Only set the name if it is defined
      if (value != undefined) {
        widget.setValue(attributes[name]);
      }
    }

    return this.form;
  }

  /**
   * This will check for changed inputs, but some are required for patch call
   * POST - Only required and if changed; UNLESS it is a clone, then pass all values
   * PATCH - Only required and if changed
   *
   * @returns {formData} as JSON object
   */
  _getLeafFormData() {
    const formData = {};

    // Name: Always sent
    formData.name = this._name.getValue();

    // NOTE: Path: Should never change or be sent

    // Parent: Always send
    formData.parent = Number(this._parentLeaf.getValue());

    // Custom attributes
    const attrVals = this._getWidgetValues();
    if (attrVals !== {}) {
      formData.attributes = attrVals;
    }

    // Always send the type
    formData.type = this._fromType;

    return formData;
  }

  _getWidgetValues() {
    let values = {};
    for (const widget of this.widgets) {
      const val = widget.getValue();
      if (val === null && widget.required) {
        // values = null;
        // break;
        console.warn("User left a required field null.");
      } else if (val !== null) {
        values[widget.getAttribute("name")] = val;
      }
    }
    return values;
  }

  _leafFormData({ form = this.form } = {}) {
    const data = {};
    const formData = this._getLeafFormData(form);

    data.newName = this._name.getValue();
    data.oldName = this.dataset.oldName;
    data.formData = formData;
    data.id = this._data.id;

    return data;
  }
}

customElements.define("leaf-form", LeafForm);
