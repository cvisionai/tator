import { ModalDialog } from "../../components/modal-dialog";
import { store, getCompiledList, getCompiledVersionList } from "../store.js"

export class AffiliationMembershipDialog extends ModalDialog {
   constructor() {
      super();

      this._title.nodeValue = "Add Affiliate to Project";
      this._main.style.marginBottom = "0";
      this._main.style.paddingBottom = "0";

      this._membershipId = document.createElement("text-input");
      this._membershipId.hidden = true;
      this._main.appendChild(this._membershipId);

      this._projects = document.createElement("enum-input");
      this._projects.setAttribute("name", "Projects");
      this._main.appendChild(this._projects);

      this._versions = document.createElement("enum-input");
      this._versions.setAttribute("name", "Versions");
      this._main.appendChild(this._versions);

      this._permissionLevels = document.createElement("enum-input");
      this._permissionLevels.setAttribute("name", "Permission");
      this._permissionLevels.choices = [
         { "label": "View Only", "value": "View Only" },
         { "label": "Can Edit", "value": "Can Edit" },
         { "label": "Can Transfer", "value": "Can Transfer" },
         { "label": "Can Execute", "value": "Can Execute" },
         { "label": "Full Control", "value": "Full Control" },
      ];
      this._main.appendChild(this._permissionLevels);

      const messages = document.createElement("div");
      messages.setAttribute("class", "main__header d-flex flex-items-center flex-justify-center");
      this._main.appendChild(messages);

      this._messageList = document.createElement("ul");
      this._messageList.setAttribute("class", "form-errors");
      messages.appendChild(this._messageList);

      this._accept = document.createElement("button");
      this._accept.setAttribute("class", "btn btn-clear btn-purple");
      // this._accept.setAttribute("disabled", "");
      this._accept.textContent = "Add Member";
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
            this.showOptions();

         }
      });

      // TODO get this back in there somehow
      // // this._accept.removeAttribute("disabled");

      this._accept.addEventListener("click", evt => {
         this._confirm = true;
         if (this._projects.getValue()) {
            const value = this._projects.getValue();
            console.log("Value is " + value)
            // window.location.replace(`/${value}/project-settings?un=${this._username}#Membership-New`)
            store.getState().updateMembership({
               membershipId: this._membershipId.getValue(),
               permission: this._permissionLevels.getValue(),
               baseVersion: Number(this._versions.getValue())
            });
         }

         this._closeCallback();
      });

      //   this._name.addEventListener("input", this._validateName.bind(this));
      this.addEventListener("open", this.setProjects.bind(this));
      this.addEventListener("close", this.clearDialog.bind(this));
   }

   set username(val) {
      this._username = val;
   }

   async setProjects() {
      this._projects.clear();
      const projectChoices = await getCompiledList({ type: "Project" }); // todo skip if user doesn't have those project permissions
      this._projects.choices = projectChoices;
   }

   async showOptions() {
      // setup version list
      const projectId = this._projects.getValue();
      console.log(projectId);
      const versionsList = await getCompiledVersionList({ projectId });
      this._versions.choices = versionsList;

      // unhide
      this._permissionLevels.hidden = false;
      this._versions.hidden = false;
   }

   clearDialog() {
      this._projects.clear();

      this._permissionLevels.setValue("");
      this._permissionLevels.hidden = true;

      this._versions.clear();
      this._versions.hidden = true;
      
      this._membershipId.setValue("");
   }

   async setUpAddNew() {
      this.clearDialog();
      this._title.nodeValue = "Add Affiliate to Project";
      this._accept.textContent = "Add Member";
      await this.setProjects();
      this._projects.setValue(-1);
      // this._projects.permission = "Can Edit";
      this.setAttribute("is-open", "true");
   }

   async setUpEditExisting(membership) {
      console.log("setUpEditExisting.........................................", membership);
      this.clearDialog();
      
      this._title.nodeValue = "Edit Affiliate Membership";
      this._accept.textContent = "Edit Member";
      await this.setProjects();
      this._projects.setValue(membership.project);
      this._projects.hidden = true;
      await this.showOptions();
      this._membershipId.setValue(membership.id);
      this._permissionLevels.setValue(membership.permission);
      this._versions.setValue(String(membership.default_version));

      
      // this._projects.permission = "View Only";
      this.setAttribute("is-open", "true");
   }

}

customElements.define("affilation-membership-dialog", AffiliationMembershipDialog);
