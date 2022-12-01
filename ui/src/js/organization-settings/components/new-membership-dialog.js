import { ModalDialog } from "../../components/modal-dialog";
import { store } from "../store.js"

export class AffiliationMembershipDialog extends ModalDialog {
  constructor() {
     super();
     
     this._title.nodeValue = "Add Affiliate to Project";
    this._main.style.marginBottom = "0";
    this._main.style.paddingBottom = "0";

    this._projects = document.createElement("enum-input");
    this._projects.setAttribute("name", "Project");
    this._main.appendChild(this._projects);

    const messages = document.createElement("div");
    messages.setAttribute("class", "main__header d-flex flex-items-center flex-justify-center");
    this._main.appendChild(messages);

    this._messageList = document.createElement("ul");
    this._messageList.setAttribute("class", "form-errors");
    messages.appendChild(this._messageList);

    const li = document.createElement("li");
    this._messageList.appendChild(li);

    this._nameWarning = document.createElement("h3");
    this._nameWarning.setAttribute("class", "h3 text-red");
    this._nameWarning.setAttribute("style", "text-align:center;width:400px");
    this._nameWarning.textContent = "Project with this name exists!";
    this._nameWarning.style.display = "none";
    li.appendChild(this._nameWarning);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-purple");
    this._accept.setAttribute("disabled", "");
    this._accept.textContent = "Go To Project & Add";
    this._footer.appendChild(this._accept);

    // Indicates whether project was created.
    this._confirm = false;
    
    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

     cancel.addEventListener("click", this._closeCallback);
     
     this._projects.addEventListener("change", () => {
        if (this._projects.getValue()) {
         this._accept.removeAttribute("disabled");
        }
     });

    this._accept.addEventListener("click", evt => {
       this._confirm = true;
       if (this._projects.getValue()) {
         const value = this._projects.getValue();
         console.log("Value is "+value)
         window.location.replace(`/${value}/project-settings?un=${this._username}#Membership-New`)
       }
       
      this._closeCallback();
    });

   //   this._name.addEventListener("input", this._validateName.bind(this));
     this.addEventListener("open", this.setProjects.bind(this));
  }

   set username(val) {
      this._username = val;
   }

   async setProjects() {
      this._projects.clear();
      await store.getState().initType("Project");
      const projects = store.getState().Project.map;
      const projectChoices = [];
      for (let [id, project] of projects) {
         projectChoices.push({
            value: id,
            label: project.name
         });
      }
      this._projects.choices = projectChoices;
  }
   

}

customElements.define("affilation-membership-dialog", AffiliationMembershipDialog);
