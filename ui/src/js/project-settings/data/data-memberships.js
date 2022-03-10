import { sameOriginCredentials } from "../../util/same-origin-credentials.js";

export class MembershipData {
  constructor(projectId){
    this.projectId = projectId;

    this._versionsPromise = fetch(`/rest/Versions/${this.projectId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  _getMembershipPromise(projectId = this.projectId){
    // Membership section.
    this.membershipBlock = document.createElement("membership-edit");
    const membershipPromise = this.membershipBlock._fetchGetPromise({"id": this.projectId} );
    return membershipPromise;
  }

  getVersionsPromise() {
    // Returns promise with versions retrieved from server.
    return this._versionsPromise;
  }
}
