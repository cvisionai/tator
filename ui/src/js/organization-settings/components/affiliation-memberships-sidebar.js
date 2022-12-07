import { TatorElement } from "../../components/tator-element";
import TatorSymbol from "../../../images/tator-logo-symbol-only.png";
import { store } from "../store";
import { AffiliationMembershipDialog } from "./new-membership-dialog";

export class AffiliationMembershipSidebar extends TatorElement {
  constructor() {
    super();

    // 
    var template = document.getElementById("memberships-sidebar-template");
    var clone = document.importNode(template.content, true);
    this._shadow.appendChild(clone);

    this._sidebar = this._shadow.getElementById("memberships-sidebar");
    this._projListCount = this._shadow.getElementById("memberships-sidebar--count");
    this._listDiv = this._shadow.getElementById("memberships-sidebar--list");

    this._addNew = this._shadow.getElementById("memberships-sidebar--add");
    this._addNewDialog = new AffiliationMembershipDialog(); // try doc create element instead?
    this._shadow.appendChild(this._addNewDialog);
    this._addNew.addEventListener("click", this.openAddNew.bind(this));
  }

  /**
   * @param {Array || null} list of memberships
   * 
   */
  set data(val) {
    this._listDiv.innerHTML = "";
    this.projectsCount = 0;

    if (val && val !== null && Array.isArray(val)) {
      this._data = val;
      this.setupSidebar();
    } else {
      console.log("There are no affiliations....")
      this._data = null;
    }
  }

  set projectsCount(val) {
    this._projListCount.textContent = val;
  }

  set username(val) {
    this._addNewDialog.username = val;
  }

  async setupSidebar() {
    let count = 0;
    this.projectsCount = this._data.length;
    for (let m of this._data) {
      const membership = await store.getState().getData("Membership", m);
      console.log(`${count}. Attempting to make sidebar item for membership `, membership);
      count++;
      // 
      const sidebarItem = document.getElementById("memberships-sidebar-item-template");
      const cloneSidebarItem = document.importNode(sidebarItem.content, true);
      
      const project = await store.getState().getData("Project", membership.project);
      const projectId = project.id;
      console.log(project);

      const currentMemberItem = store.getState().currentUser.membershipsByProject.has(projectId) ? store.getState().currentUser.membershipsByProject.get(projectId) : null;
      const hasControl = currentMemberItem ? (currentMemberItem.permission === "Full Control") : false;

      //
      const projectInfo = cloneSidebarItem.getElementById("projectname");
      projectInfo.classList.remove("hidden");

      //
      const projectThumb = cloneSidebarItem.getElementById("membership-item--thumb");
      if (project.thumb) {
        projectThumb.setAttribute("src", project.thumb);
      } else {
        project.thumb.setAttribute("src", TatorSymbol);
      }
      

      //
      const projectName = cloneSidebarItem.getElementById("membership-item--project");
      if (hasControl) {
        projectName.setAttribute("href", `/${membership.project}/project-setting`);
      }
      
      projectName.textContent = project.name;

      //
      const permission = cloneSidebarItem.getElementById("membership-item--permission");
      permission.textContent = membership.permission

      //
      const editLink = cloneSidebarItem.getElementById("membership-item--edit");
      editLink.addEventListener("click", () => {
        console.log("Open membership dialog (existing)");
        this._addNewDialog.setUpEditExisting(membership);
      });

      this._listDiv.appendChild(cloneSidebarItem);
    }
  }

  openAddNew() {
    console.log("Open up (new)!");
    this._addNewDialog.setUpAddNew();
  }
}

customElements.define("affiliation-membership-sidebar", AffiliationMembershipSidebar);
