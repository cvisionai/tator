import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { Utils } from 'tator';

const api = Utils.getApi();

async function configureImageClassification(project) {
  let response = await api.createMediaType(project.id, {
    name: "Images",
    dtype: "image",
    attribute_types: [{
      name: "Label",
      description: "Image classification label.",
      dtype: "string",
      order: 0,
    }],
  });
  console.log(response.message);
}

async function configureObjectDetection(project) {
  let response = await api.createMediaType(project.id, {
    name: "Images",
    dtype: "image",
    attribute_types: [],
  });
  console.log(response.message);
  const imageTypeId = response.id;

  response = await api.createMediaType(project.id, {
    name: "Videos",
    dtype: "video",
    attribute_types: [],
  });
  console.log(response.message);
  const videoTypeId = response.id;

  response = await api.createLocalizationType(project.id, {
    name: "Boxes",
    dtype: "box",
    media_types: [imageTypeId, videoTypeId],
    attribute_types: [{
      name: "Label",
      description: "Object detection label.",
      dtype: "string",
      order: 0,
    }],
  });
  console.log(response.message);
}

async function configureMultiObjectTracking(project) {
  let response = await api.createMediaType(project.id, {
    name: "Videos",
    dtype: "video",
    attribute_types: [],
  });
  console.log(response.message);
  const videoTypeId = response.id;

  response = await api.createStateType(project.id, {
    name: "Tracks",
    association: "Localization",
    interpolation: "none",
    media_types: [videoTypeId],
    attribute_types: [{
      name: "Label",
      description: "Track label.",
      dtype: "string",
      order: 0,
    }],
  });
  console.log(response.message);

  response = await api.createLocalizationType(project.id, {
    name: "Boxes",
    dtype: "box",
    media_types: [videoTypeId],
    attribute_types: [],
  });
}

async function configureActivityRecognition(project) {
  let response = await api.createMediaType(project.id, {
    name: "Videos",
    dtype: "video",
    attribute_types: [],
  });
  console.log(response.message);
  const videoTypeId = response.id;

  response = await api.createStateType(project.id, {
    name: "Activities",
    association: "Frame",
    interpolation: "latest",
    media_types: [videoTypeId],
    attribute_types: [{
      name: "Something in view",
      description: "Whether something is happening in the video.",
      dtype: "bool",
      order: 0,
    }],
  });
  console.log(response.message);
}

const store = create(subscribeWithSelector((set, get) => ({
  projects: [],
  organizations: [],
  fetchProjects: async () => {
    set({ projects: await api.getProjectList() });
  },
  fetchOrganizations: async () => {
    set({ organizations: await api.getOrganizationList() });
  },
  addProject: async (projectSpec, preset) => {
    let response = await api.createProject(projectSpec);
    console.log(response.message);
    switch (preset) {
      case "imageClassification":
        await configureImageClassification(project);
        break;
      case "objectDetection":
        await configureObjectDetection(project);
        break;
      case "multiObjectTracking":
        await configureMultiObjectTracking(project);
        break;
      case "activityRecognition":
        promise = this._configureActivityRecognition(projectPromise);
        break;
      case "none":
        break;
      default:
        console.error(`Invalid preset: ${preset}`);
    }
    set({ projects: get().projects.push(response.object) });
  },
  removeProject: async (id) => {
    const response = await api.deleteProject(id);
    console.log(repsonse.message);
    set({ projects: get().projects.filter(project => project.id != id) });
  }
})));

export {store};

