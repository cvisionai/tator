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

      this._affiliates = document.createElement("enum-input");
      this._affiliates.hidden = true;
      this._affiliates.setAttribute("name", "User");
      this._main.appendChild(this._affiliates);

      this._affiliates.addEventListener("change", this.setUserIdFromEvent.bind(this));

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

      this._accept.addEventListener("click", this.saveData.bind(this)); 

      //   this._name.addEventListener("input", this._validateName.bind(this));
      this.addEventListener("open", this.setProjects.bind(this));
      this.addEventListener("close", this.clearDialog.bind(this));

   }

   async getUsernames() {
      await store.getState().initType("Affiliation");
      const affiliates = await store.getState().Affiliation.userMap

      const choices = [];
      for (let [un, val] of affiliates) {
         choices.push({
            label: un,
            value: await store.getState().getUser(un)
         });
      }
      this._affiliates.choices = choices;
   }

   set username(val) {
      this._username = val;
      this.setUserId(this._username); 
   }

   set pageModal(val) {
      this._pageModal = val;
   }

   async setUserId(un) {
      this._user = await store.getState().getUser(un);
      this._userId = this._user.id;
   }

   setUserIdFromEvent() {
      this._userId = this._affiliates.getValue();
   }

   async setProjects() {
      this._projects.clear();
      // todo skip if user doesn't have those project permissions Or if is already in that project
      const projectChoices = await getCompiledList({ type: "Project" }); 
      this._projects.choices = projectChoices;
   }

   async showOptions() {
      // setup version list
      const projectId = this._projects.getValue();

      this._versions.clear();
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

      this._messageList.innerHTML = "";
   }

   async setUpAddNew(projectId = null) {
      this.clearDialog();
      this._title.nodeValue = "Add Affiliate to Project";
      this._accept.textContent = "Add Member";
      this._membershipId.setValue(null);
      await this.setProjects();

      if (projectId == null) {
         this._projects.hidden = false;
      } else {
         
         
         this._projects.setValue(String(projectId));
         // this._projects.hidden = true;
         await this.getUsernames();
         this._affiliates.hidden = false;

         await this.showOptions();
      }
      
      this.setAttribute("is-open", "true");
   }

   async setUpEditExisting(membership) {
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

   async saveData() {
      this._confirm = true;
      let info = null;
      if (this._membershipId.getValue()) {
         const formData = {};

         if (this._permissionLevels.changed()) formData.permission = this._permissionLevels.getValue();
         if (this._versions.changed()) formData.baseVersion = Number(this._versions.getValue());
         
         info = await store.getState().updateMembership({
            membershipId: this._membershipId.getValue(),
            formData
         });


      } else if(this._projects.getValue()) {
         const formData = {
            permission: this._permissionLevels.getValue(),
            default_version: Number(this._versions.getValue()),
            project: Number(this._projects.getValue()),
            user: this._userId,
            username: this._username
         }
         
         info = await store.getState().addMembership({
            projectId: this._projects.getValue(),
            formData
         });
      } else {
         return console.error("Some data is missing to complete this edit/add.")
      }

      if (info.response) {   
         if (info.response.ok) {
            this._closeCallback();
            this._pageModal._success(info.data.message);
         } else if(info.response.body?.message) {
            this._messageList.innerHTML = `
               <li>${info.response.body.message}</li>
            `;
         } else if (info.response.text) {
            this._messageList.innerHTML = `
            <li>${info.response.text}</li>
         `;           
         }
      } else {
         this._messageList.innerHTML = `<li>${info}</li>`;
         this._pageModal._error("Error editing or adding affiliation.");
      }


      
   }

}

customElements.define("affilation-membership-dialog", AffiliationMembershipDialog);
