import { TypeFormTemplate } from "../components/type-form-template.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { Utilities } from "../../util/utilities.js";
import { getCompiledList, store } from "../store.js";

export class AlgorithmEdit extends TypeFormTemplate {
  constructor() {
    super();
    this.typeName = "Algorithm";
    this.readableTypeName = "Algorithm";
    this._hideAttributes = true;
    this.versionId = null;

    // To show who algo is registered to
    this._userData = document.createElement("user-data");

    //
    var templateInner = document.getElementById("algorithm-edit");
    var innerClone = document.importNode(templateInner.content, true);
    this._shadow.appendChild(innerClone);

    this._form = this._shadow.getElementById("algorithm-edit--form");
    this._userMessage = this._shadow.getElementById(
      "algorithm-edit--user-message"
    );
    this._editName = this._shadow.getElementById("algorithm-edit--name");
    this._editDescription = this._shadow.getElementById(
      "algorithm-edit--description"
    );
    this._userEdit = this._shadow.getElementById("algorithm-edit--user");
    this._userEditVisible = this._shadow.getElementById(
      "algorithm-edit--registering-user"
    );
    this._manifestPath = this._shadow.getElementById(
      "algorithm-edit--manifest"
    );
    this._clusterEnumInput = this._shadow.getElementById(
      "algorithm-edit--job-cluster"
    );
    this._filesPerJob = this._shadow.getElementById("algorithm-edit--files");
    this._categoriesList = this._shadow.getElementById(
      "algorithm-edit--categories"
    );
    this._parametersList = this._shadow.getElementById(
      "algorithm-edit--parameters"
    );

    this._currentUser = null;
  }

  async connectedCallback() {
    store.subscribe(
      (state) => state.JobClusterPermission,
      this.savePermission.bind(this)
    );
    store.subscribe(
      (state) => state.Project,
      this.setManifestInfo.bind(this),
      []
    );
    store.subscribe(
      (state) => state.isStaff,
      this.resetClusterPermission.bind(this),
      []
    );

    if (store.getState().JobClusterPermission) {
      this.savePermission(store.getState().JobClusterPermission);
    }

    if (store.getState().Project) {
      this.setManifestInfo(store.getState().Project);
    }
  }

  async resetClusterPermission() {
    store.getState().setJobClusterPermissions();
  }

  async setManifestInfo(project) {
    this.projectId = project.data.id;
    this._manifestPath.projectId = project.data.id;
    this._manifestPath.organizationId = project.data.organization;
  }

  /**
   * Sets up the message at top of form based on combination of if...
   * - NEW algorithm: Cluster required; Prompt to ask admin, or link to add one
   * - Edit algorithm: User without access to Job Cluster endpoint can edit algorithms...
   *   but won't know what job cluster is (only works if it there)
   * - Edit algorithm: Organizations without Job Clusters are required to add one to edit
   */
  savePermission(setPermission) {
    this.cantSave = setPermission.userCantSave;
    this.cantSee = setPermission.userCantSeeCluster;
    if (this.cantSave) this.showMessagesCantSave(this._data?.id == "New");
    if (this.cantSee) this.showMessagesCantSee(this._data?.id == "New");
  }

  showMessagesCantSee(isNew) {
    console.log("showMessagesCantSee");
    if (isNew) {
      this._userMessage.textContent =
        "Required: A Job Cluster is required to add an algorithm. User is not authorized to select a Job Cluster. ";
      // store.setState({ status: { ...store.getState().status, name: "error", message: "View Only: Please add a Job Cluster" } });
      this.dispatchEvent(new Event("hide-save"));
    } else {
      this._userMessage.textContent =
        "Warning: Current user does not have access to view Job Clusters. Edits will only save if an active cluster is already present.";
      // store.setState({ status: { ...store.getState().status, name: "idle", message: "" } });
    }
    this._userMessage.hidden = false;
  }

  showMessagesCantSave(isNew) {
    console.log("showMessagesCantSave");
    if (isNew) {
      this._userMessage.innerHTML = `Required: Add a Job Cluster via <a href="/${
        store.getState().organizationId
      }/organization-settings#JobCluster-New" class="text-purple clickable">Organization Settings</a> to add an algorithm.`;
    } else {
      this._userMessage.innerHTML = `View Only: Please add a Job Cluster via <a href="/${
        store.getState().organizationId
      }/organization-settings#JobCluster-New" class="text-purple clickable">Organization Settings</a> to edit this algorithm.`;
    }
    // store.setState({ status: { ...store.getState().status, name: "error", message: "View Only: Please add a Job Cluster" } });
    this._userMessage.hidden = false;
    this.dispatchEvent(new Event("hide-save"));
  }

  async _setupFormUnique() {
    // Show appropriate messages if required
    if (this.cantSave) this.showMessagesCantSave(this._data.id == "New");
    if (this.cantSee) this.showMessagesCantSee(this._data.id == "New");

    // description
    this._editDescription.permission = !this.cantSave
      ? "Can Edit"
      : "View Only";
    this._editDescription.setValue(this._data.description);
    this._editDescription.default = this._data.description;

    // User
    // TODO move User data to store
    try {
      if (this._data.id == "New") {
        if (this._currentUser == null) {
          this._currentUser = await store.getState().getUser("GetCurrent");
        }

        //use current user
        this._registeredUserName = `${this._currentUser.first_name} ${this._currentUser.last_name}`;
        this._registeredUserId = this._currentUser.id;
      } else {
        const userData = await store.getState().getUser(this._data.user);
        this._registeredUserName = `${userData.first_name} ${userData.last_name}`;
        this._registeredUserId = this._data.user;
      }
    } catch (err) {
      console.error("Couldn't get user data.", err);
      this._registeredUserName = "";
      this._registeredUserId = "";
    }

    // Visible input with readable name
    this._userEditVisible.permission = "View Only"; //!this.userCantSaveCluster ? "Can Edit" : "View Only";
    this._userEditVisible.setValue(this._registeredUserName);
    this._userEditVisible.default = this._registeredUserName;

    // Note: HIDDEN input for formValue of ID; Name is for user only
    this._userEdit.default = this._registeredUserId;
    this._userEdit.setValue(this._registeredUserId);
    this._userEdit.permission = null;

    // Path to manifest
    this._manifestPath.permission = !this.cantSave ? "Can Edit" : "View Only";
    if (this._data.manifest) {
      this._manifestPath.setValue(`${this._data.manifest}`);
      this._manifestPath.default = `${this._data.manifest}`;
    } else {
      this._manifestPath.setValue(null);
      this._manifestPath.default = null;
    }

    // override the fetch call on this web component
    this._manifestPath._fetchCall = async (bodyData) => {
      const resp = await fetchCredentials(
        `/rest/SaveAlgorithmManifest/${this.projectId}`,
        {
          method: "POST",
          body: JSON.stringify(bodyData),
        }
      );
      if (resp.ok) {
        const manifestData = await resp.json();
        const viewLink = `${manifestData.url}`;
        this._manifestPath.setValue(viewLink);
        Utilities.showSuccessIcon(`Manifest file uploaded to: ${viewLink}`);
      } else {
        console.error(resp);
      }
    };

    // Cluster
    this._clusterEnumInput.removeAttribute("tooltip"); //reset tooltip
    this._clusterEnumInput.clear();
    if (!this.cantSee) {
      // if they aren't a non auth user
      const jobClusterWithChecked = await getCompiledList({
        type: "JobCluster",
        skip: null,
        check: this._data.cluster,
      });

      // Check if there are going to be enum values first, show input with NULL
      if (jobClusterWithChecked == null || jobClusterWithChecked.length == 0) {
        this._clusterEnumInput.disabled = true;
        this._clusterEnumInput.setValue("Null");
        this._clusterEnumInput.setAttribute(
          "tooltip",
          "No Job Clusters associated to this Organization"
        );
      } else {
        this._clusterEnumInput.removeAttribute("disabled");
        this._clusterEnumInput.permission = !this.userCantSaveCluster
          ? "Can Edit"
          : "View Only";
        this._clusterEnumInput.choices = [
          { label: "None", value: "" },
          ...jobClusterWithChecked,
        ];
        this._clusterEnumInput.default = this._data.cluster;
        this._clusterEnumInput.setValue(this._data.cluster);
      }
    } else {
      this._clusterEnumInput.disabled = true;
      this._clusterEnumInput.default = this._data.cluster;
      this._clusterEnumInput.setValue(this._data.cluster);
    }

    // Files per job
    this._filesPerJob.permission = !this.cantSave ? "Can Edit" : "View Only";
    this._filesPerJob.setValue(this._data.files_per_job);
    this._filesPerJob.default = this._data.files_per_job;

    // Categories
    this._categoriesList.clear();
    this._categoriesList.permission = !this.cantSave ? "Can Edit" : "View Only";
    this._categoriesList.setValue(this._data.categories);
    this._categoriesList.default = this._data.categories;

    // Parameters
    this._parametersList.clear();
    let paramInputTypes = JSON.stringify({
      name: "text-input",
      value: "text-input",
    });
    let paramInputTemplate = JSON.stringify({ name: "", value: "" });
    this._parametersList.permission = !this.cantSave ? "Can Edit" : "View Only";
    this._parametersList.setAttribute("properties", paramInputTypes);
    this._parametersList.setAttribute("empty-row", paramInputTemplate);
    this._parametersList.setValue(this._data.parameters);
    this._parametersList.default = this._data.parameters;
  }

  _getFormData() {
    const formData = {};
    const isNew = true;

    if (this._editName.changed() || isNew) {
      formData.name = this._editName.getValue();
    }

    if (this._editDescription.changed() || isNew) {
      formData.description = this._editDescription.getValue();
    }

    if (this._manifestPath.changed() || this._manifestPath.getValue() !== "") {
      formData.manifest = this._manifestPath.getValue();
    } else if (isNew && !this._manifestPath.changed()) {
      formData.manifest = null;
    }

    if (!(this.cantSave || this.cantSee)) {
      if (this._clusterEnumInput.changed() || isNew) {
        let clusterValue = this._clusterEnumInput.getValue();
        if (
          clusterValue === null ||
          clusterValue === "Null" ||
          clusterValue == ""
        ) {
          formData.cluster = null;
        } else {
          formData.cluster = Number(clusterValue);
        }
      }
    }

    if (this._userEdit.changed() || isNew) {
      formData.user = Number(this._userEdit.getValue());
    }

    if (this._filesPerJob.changed() || isNew) {
      formData.files_per_job = this._filesPerJob.getValue();
    }

    if (this._categoriesList.changed() || isNew) {
      formData.categories = this._categoriesList.getValue();
    }

    if (this._parametersList.changed() || isNew) {
      formData.parameters = this._parametersList.getValue();
    }

    return formData;
  }
}

customElements.define("algorithm-edit", AlgorithmEdit);
