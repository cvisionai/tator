class OrganizationData {
  constructor(organizationId){
    this.organizationId = organizationId;
  }

  // Organization CRUD
  getOrganization() {
    return fetch(`/rest/Organization/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  updateOrganization(update) {
    return fetch(`/rest/Organization/${this.organizationId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  // Affiliation CRUD
  getAffiliations() {
    return fetch(`/rest/Affiliations/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  createAffiliation(spec) {
    return fetch(`/rest/Affiliations/${this.organizationId}`, {
      method: "POST",
      body: JSON.stringify(spec),
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  updateAffiliation(id, update) {
    return fetch(`/rest/Affiliation/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  deleteAffiliation(id) {
    return fetch(`/rest/Affiliation/${id}`, {
      method: "DELETE",
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  // Bucket CRUD
  getBuckets() {
    return fetch(`/rest/Buckets/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  createBucket(spec) {
    return fetch(`/rest/Bucket/${this.organizationId}`, {
      method: "POST",
      body: JSON.stringify(spec),
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  updateBucket(id, update) {
    return fetch(`/rest/Bucket/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  deleteBucket(id) {
    return fetch(`/rest/Bucket/${id}`, {
      method: "DELETE",
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  // Job Cluster CRUD
  getJobClusters() {
    return fetch(`/rest/JobClusters/${this.organizationId}`, {
      method: "GET",
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  createJobCluster(spec) {
    return fetch(`/rest/JobClusters/${this.organizationId}`, {
      method: "POST",
      body: JSON.stringify(spec),
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  updateJobCluster(id, update) {
    return fetch(`/rest/JobCluster/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }

  deleteJobCluster(id) {
    return fetch(`/rest/JobCluster/${id}`, {
      method: "DELETE",
      ...sameOriginCredentials(),
    })
    .then(response => response.json());
  }
}
