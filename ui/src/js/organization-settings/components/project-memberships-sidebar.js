import { TatorElement } from "../../components/tator-element";
import { store } from "../store.js"

export class ProjectMembershipSidebar extends TatorElement {
  constructor() {
    super();

    // 
    var template = document.getElementById("org-project-memberships-template");
    var clone = document.importNode(template.content, true);
    this._shadow.appendChild(clone);

    this._sidebar = this._shadow.getElementById("org-project-memberships");
    this._affListCount = this._shadow.getElementById("aff-member-cout");
    this._affList = this._shadow.getElementById("org-project-memberships--affilate-list");
    this._nonAffListCount = this._shadow.getElementById("nonaff-member-cout");
    this._nonAffList = this._shadow.getElementById("org-project-memberships--nonaffilate-list");

    this._addNew = this._shadow.getElementById("memberships-sidebar--add");
    this._addNew.addEventListener("click", this.addNewMembership.bind(this));
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

    if (val && val !== null && Array.isArray(val)) {
      this._data = val;
      this.setupSidebar();
    } else {
      console.log("There are no affiliations....")
      this._data = null;
    }
  }

  set affListCount(val) {
    this._affListCount.textContent = val;
  }

  set nonAffListCount(val) {
    this._nonAffListCount.textContent = val;
  }

  // save and formdata
  async setupSidebar() {
    let even = false
    let affCount = 0;
    let nonAffCount = 0;

    const projectId = this._data[0].project;
    this._project = projectId;
    console.log("Side bar project id is: "+projectId);

    const currentMemberItem = store.getState().currentUser.membershipsByProject.has(projectId) ? store.getState().currentUser.membershipsByProject.get(projectId) : null;
    console.log(currentMemberItem);
    const hasControl = currentMemberItem ? (currentMemberItem.permission === "Full Control") : false;

    if (!hasControl) {
      this._addNew.classList.add("hidden")
    }

    console.log("::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::");
    console.log("Setup sidebar", this._data);

    for (let m of this._data) {
      console.log(`attempting to make sidebar item for membership `, m);
      // const projectId = m.project;
      const isAff = store.getState().Project.setList.has(projectId);

      if (isAff) {
        affCount++;
      } else {
        nonAffCount
      }

      // 
      const sidebarItem = document.getElementById("memberships-sidebar-item-template");
      const cloneSidebarItem = document.importNode(sidebarItem.content, true);

      //
      const userInfo = cloneSidebarItem.getElementById("username");
      userInfo.classList.remove("hidden");

      //
      const username = m.username;
      let initials = username.match(/\b\w/g) || [];
      initials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
      const avatar = cloneSidebarItem.getElementById("membership-item--avatar");
      avatar.textContent = initials;

      const userName = cloneSidebarItem.getElementById("membership-item--name");
      userName.textContent = `${username}`
      
      //
      const permission = cloneSidebarItem.getElementById("membership-item--permission");
      permission.textContent = m.permission

      //
      // const affiliateId = await store.getState().getMembershipData(m.username);
      // console.log(affiliateId);
      // const affiliateId = cloneSidebarItem.getElementById("affiliate-id");
      // affiliateId.textContent = m.affiliationId;

      // const affiliateLink = cloneSidebarItem.getElementById("affiliate-link");
      // affiliateLink.setAttribute("href", `${m.project}/project-settings#Membership-${m.id}`)

      //
      const projectEditLink = cloneSidebarItem.getElementById("membership-item--edit");
      
      if (hasControl) {
        projectEditLink.setAttribute("href", `/${m.project}/project-settings#Membership-${m.id}`)        
      } else {
        projectEditLink.hidden = true;
      }


      if (isAff) {
        this._affList.appendChild(cloneSidebarItem);
      } else {
        this._nonAffList.appendChild(cloneSidebarItem);
      }
      if(even) avatar.setAttribute("style", "background-color: #696cff");
      even = true;
    }
    this.affListCount = affCount;
    this.nonAffListCount = nonAffCount;
    console.log("::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::");
  }

  addNewMembership() {
    // get /{project-id}/project-settings#Membership-New
    const projectId = store.getState().selection.typeId;
    window.location.replace(`/${projectId}/project-settings#Membership-New`);
  }
}

customElements.define("project-membership-sidebar", ProjectMembershipSidebar);
