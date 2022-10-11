import { TatorElement } from "../../components/tator-element.js";
import { store } from "../store.js";

export class TypeForm extends TatorElement {
  constructor() {
    super();

    this.projectForm = null;
    this.setupMap();
  }

  /**
 * @param {int} val
 */
  set _projectId(val) {
    this.projectId = val;

    for (let key of this.viewClassesByName.keys()) {
      const info = this.viewClassesByName.get(key);
      const form = info.formRef;
      form.projectId = val;
    }
  }

  /**
   * @param {{ typeName: string; typeId: int; }} val
   */
  set selection(val) {
    this._selection = val;
    this._typeName = val.typeName;
    this._typeId = val.typeId;
  }

  // set typeData(val) {
  //   this._typeData = val;
  //   this.setForm();
  // }

  

  init(modal, isStaff, canDeleteProject) {
    this.modal = modal;
    this._isStaff = isStaff;
    console.log("init of TYPE FORM CONTAINER");
    for (let key of this.viewClassesByName.keys()) {
      console.log(key);
      const info = this.viewClassesByName.get(key);
      console.log(info);
      const form = info.formRef;
      console.log(form);
      form.init(this, modal, isStaff, canDeleteProject);
    }
  }

  setForm() {
    // Init the correct form with data
    const form = this.viewClassesByName.get(this._typeName).form;
    console.log("Set form with typeid " + this._typeId);
    if (this._typeId !== "New") {
      const typeStore = store.getState()[this._typeName];
      form.data = typeStore.map.get(this._typeId);
    } else {
      form.data = form.getEmptyData();
    }
  }

  showForm() {
     // Hide the other types
     for (let key of this.viewClassesByName.keys()) {
      const info = this.viewClassesByName.get(key);
      const form = info.formRef;
      form.hidden = form.typeName !== this._typeName;
    }   
  }


  setupMap() {
    this.viewClassesByName = new Map();
    this.viewClassesByName.set("Project", {
      element: "project-main-edit"
    }).set("MediaType", {
      element: "media-type-edit"
    })
      .set("LocalizationType", {
        element: "localization-edit"
      })
      .set("LeafType", {
        element: "leaf-type-edit"
      })
      .set("StateType", {
        element: "state-type-edit"
      })
      .set("Membership", {
        element: "membership-edit"
      })
      .set("Version", {
        element: "versions-edit"
      })
      .set("Algorithm", {
        element: "algorithm-edit"
      })
      .set("Applet", {
        element: "applet-edit"
      });

    for (let key of this.viewClassesByName.keys()) {
      const info = this.viewClassesByName.get(key);
      const form = document.createElement(info.element);
      form.hidden = true;
      this._shadow.appendChild(form);

      this.viewClassesByName.set(key, { ...info, formRef: form });
      if (key == "Project") this.projectForm = form;
    }
  }

}



if (!customElements.get("type-form")) {
  customElements.define("type-form", TypeForm);
}
