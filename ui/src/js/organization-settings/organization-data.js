import { sameOriginCredentials } from "../util/same-origin-credentials.js";


function handleErrors(response) {
  return response.json()
  .then(data => {
    if (!response.ok) {
      throw Error(data.message);
    }
    return data;
  });
}

export class OrganizationData {
  constructor(organizationId) {
    this.organizationId = organizationId;
  }

  // Organization CRUD
  getOrganization() {
    return fetch(`/rest/Organization/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  updateOrganization(update) {
    return fetch(`/rest/Organization/${this.organizationId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  // Affiliation CRUD
  getAffiliations() {
    return fetch(`/rest/Affiliations/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  createAffiliation(spec) {
    return fetch(`/rest/Affiliations/${this.organizationId}`, {
      method: "POST",
      body: JSON.stringify(spec),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  updateAffiliation(id, update) {
    return fetch(`/rest/Affiliation/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  deleteAffiliation(id) {
    return fetch(`/rest/Affiliation/${id}`, {
      method: "DELETE",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  // Invitation CRUD
  getInvitations() {
    return fetch(`/rest/Invitations/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  createInvitation(spec) {
    return fetch(`/rest/Invitations/${this.organizationId}`, {
      method: "POST",
      body: JSON.stringify(spec),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  updateInvitation(id, update) {
    return fetch(`/rest/Invitation/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  deleteInvitation(id) {
    return fetch(`/rest/Invitation/${id}`, {
      method: "DELETE",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  // Bucket CRUD
  getBuckets() {
    return fetch(`/rest/Buckets/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  createBucket(spec) {
    return fetch(`/rest/Bucket/${this.organizationId}`, {
      method: "POST",
      body: JSON.stringify(spec),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  updateBucket(id, update) {
    return fetch(`/rest/Bucket/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  deleteBucket(id) {
    return fetch(`/rest/Bucket/${id}`, {
      method: "DELETE",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  // Job Cluster CRUD
  getJobClusters() {
    return fetch(`/rest/JobClusters/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  createJobCluster(spec) {
    return fetch(`/rest/JobClusters/${this.organizationId}`, {
      method: "POST",
      body: JSON.stringify(spec),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  updateJobCluster(id, update) {
    return fetch(`/rest/JobCluster/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }

  deleteJobCluster(id) {
    return fetch(`/rest/JobCluster/${id}`, {
      method: "DELETE",
      ...sameOriginCredentials(),
    })
    .then(handleErrors);
  }
}
