import { TatorElement } from "../../components/tator-element";
import { store } from "../store.js";
import { AffiliationMembershipDialog } from "./new-membership-dialog";

export class ProjectMembershipSidebar extends TatorElement {
  constructor() {
    super();

    //
    var template = document.getElementById("org-project-memberships-template");
    var clone = document.importNode(template.content, true);
    this._shadow.appendChild(clone);

    this._sidebar = this._shadow.getElementById("org-project-memberships");
    this._affListCount = this._shadow.getElementById("aff-member-cout");
    this._affList = this._shadow.getElementById(
      "org-project-memberships--affilate-list"
    );
    this._nonAffListCount = this._shadow.getElementById("nonaff-member-cout");
    this._nonAffList = this._shadow.getElementById(
      "org-project-memberships--nonaffilate-list"
    );

    this._addNew = this._shadow.getElementById("memberships-sidebar--add");
    // this._addNew.addEventListener("click", this.addNewMembership.bind(this));

    this._addNewDialog = new AffiliationMembershipDialog(); // try doc create element instead?
    this._shadow.appendChild(this._addNewDialog);

    this.modal = document.createElement("modal-dialog");
    this._addNewDialog.pageModal = this.modal;
    this._shadow.appendChild(this.modal);

    store.subscribe(
      (state) => state.Membership,
      this.processNewMemberships.bind(this)
    );
  }

  /**
   * @param {Array || null} list of memberships
   */
  set data(val) {
    // clear everything
    this._affList.innerHTML = "";
    this._nonAffList.innerHTML = "";
    this.affListCount = 0;
    this.nonAffListCount = 0;

    if (val && val !== null && Array.isArray(val.data)) {
      this._data = val.data;
      this._projectId = val.projectId;
      this.setupSidebar(val.data);
    } else {
      this._data = null;
    }
  }

  set affListCount(val) {
    this._affListCount.textContent = val;
  }

  set nonAffListCount(val) {
    this._nonAffListCount.textContent = val;
  }

  set projectId(val) {
    this._projectId = val;
  }

  processNewMemberships(newMembershipData) {
    if (newMembershipData.map && newMembershipData.map.values().length > 0) {
      const projectId = this._projectId
        ? this._projectId
        : store.getState().selection.typeId;
      const newData = newMembershipData.projectIdMembersMap.get(projectId);
      this.setupSidebar(newData);
    }
  }

  /**
   * @data is {Array}  of memberships
   */
  async setupSidebar(data) {
    let even = false;
    let affCount = 0;
    let nonAffCount = 0;
    this._affList.innerHTML = "";
    this._nonAffList.innerHTML = "";

    const projectId = this._projectId
      ? this._projectId
      : store.getState().selection.typeId;
    const hasControl = store
      .getState()
      .currentUser.membershipsByProject.has(projectId)
      ? true
      : false;
    
    await store.getState().initType("Affiliation");
    if (!hasControl) {
      this._addNew.classList.add("hidden");
    } else {
      this._addNew.setAttribute(
        "href",
        `/${projectId}/project-settings#Membership-New`
      );
    }

    for (let m of data) {
      const isAff = store.getState().Affiliation.userMap.has(m.username);

      if (isAff) {
        affCount++;
      } else {
        nonAffCount++;
      }

      //
      const sidebarItem = document.getElementById(
        "memberships-sidebar-item-template"
      );
      const cloneSidebarItem = document.importNode(sidebarItem.content, true);

      //
      const userInfo = cloneSidebarItem.getElementById("username");
      userInfo.classList.remove("hidden");

      //
      const username = m.username;
      let initials = username.match(/\b\w/g) || [];
      initials = (
        (initials.shift() || "") + (initials.pop() || "")
      ).toUpperCase();
      const avatar = cloneSidebarItem.getElementById("membership-item--avatar");
      avatar.textContent = initials;

      const userName = cloneSidebarItem.getElementById("membership-item--name");
      userName.textContent = `${username}`;

      //
      const permission = cloneSidebarItem.getElementById(
        "membership-item--permission"
      );
      permission.textContent = m.permission;

      //
      const projectEditLink = cloneSidebarItem.getElementById(
        "membership-item--edit"
      );

      if (hasControl) {
        projectEditLink.setAttribute(
          "href",
          `/${m.project}/project-settings#Membership-${m.id}`
        );
      } else {
        projectEditLink.hidden = true;
      }

      if (isAff) {
        this._affList.appendChild(cloneSidebarItem);
      } else {
        this._nonAffList.appendChild(cloneSidebarItem);
      }
      if (even) avatar.setAttribute("style", "background-color: #696cff");
      even = true;
    }

    this.affListCount = affCount;
    this.nonAffListCount = nonAffCount;
  }
}

customElements.define("project-membership-sidebar", ProjectMembershipSidebar);
