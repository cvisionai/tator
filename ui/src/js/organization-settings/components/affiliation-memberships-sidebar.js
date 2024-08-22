import { TatorElement } from "../../components/tator-element";
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
    this._projListCount = this._shadow.getElementById(
      "memberships-sidebar--count"
    );
    this._listDiv = this._shadow.getElementById("memberships-sidebar--list");

    this._addNew = this._shadow.getElementById("memberships-sidebar--add");
    this._addNewDialog = new AffiliationMembershipDialog(); // try doc create element instead?
    this._shadow.appendChild(this._addNewDialog);
    this._addNew.addEventListener("click", this.openAddNew.bind(this));

    this.modal = document.createElement("modal-dialog");
    this._addNewDialog.pageModal = this.modal;
    this._shadow.appendChild(this.modal);

    store.subscribe(
      (state) => state.Membership,
      this.processNewData.bind(this)
    );
  }

  /**
   * @param {Array || null} list of membership ids
   *
   */
  set data(val) {
    this._listDiv.innerHTML = "";
    this.projectsCount = 0;

    if (val && val !== null && Array.isArray(val)) {
      this._data = val;
      this.setupSidebar();
    } else {
      this._data = null;
    }
  }

  set projectsCount(val) {
    this._projListCount.textContent = val;
  }

  set username(val) {
    this._userName = val;
    this._addNewDialog.username = val;
  }

  processNewData(newMembership) {
    if (this._userName) {
      const newData = newMembership.usernameMembershipsMap.get(this._userName);
      this.data = newData;
    }
  }

  async setupSidebar() {
    let count = 0;
    this._listDiv.innerHTML = "";
    this.projectsCount = this._data.length;
    for (let m of this._data) {
      const membership = await store.getState().getData("Membership", m);
      count++;

      //
      const sidebarItem = document.getElementById(
        "memberships-sidebar-item-template"
      );
      const cloneSidebarItem = document.importNode(sidebarItem.content, true);

      const project = await store
        .getState()
        .getData("Project", membership.project);
      const projectId = project.id;

      const hasControl = store
        .getState()
        .currentUser.membershipsByProject.has(projectId)
        ? true
        : false;

      //
      const projectInfo = cloneSidebarItem.getElementById("projectname");
      projectInfo.classList.remove("hidden");

      //
      const projectThumb = cloneSidebarItem.getElementById(
        "membership-item--thumb"
      );
      projectThumb.style.backgroundColor = "transparent";
      if (project.thumb) {
        projectThumb.setAttribute("src", project.thumb);
      } else {
        projectThumb.setAttribute("src", "/static/images/tator-logo-symbol-only.png");
      }

      //
      const projectName = cloneSidebarItem.getElementById(
        "membership-item--project"
      );
      if (hasControl) {
        projectName.setAttribute(
          "href",
          `/${membership.project}/project-settings`
        );
      }

      projectName.textContent = project.name;

      //
      const permission = cloneSidebarItem.getElementById(
        "membership-item--permission"
      );
      permission.textContent = membership.permission;

      //
      const editLink = cloneSidebarItem.getElementById("membership-item--edit");
      if (hasControl) {
        editLink.setAttribute(
          "href",
          `/${membership.project}/project-settings#Membership-${m}`
        );
      } else {
        editLink.hidden = true;
      }

      //
      this._listDiv.appendChild(cloneSidebarItem);
    }
  }

  openAddNew() {
    this._addNewDialog.setUpAddNew();
  }
}

customElements.define(
  "affiliation-membership-sidebar",
  AffiliationMembershipSidebar
);
