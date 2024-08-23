import create from '../../../node_modules/zustand/esm/vanilla.mjs';
import { subscribeWithSelector } from '../../../node_modules/zustand/esm/middleware.js';
import { fetchCredentials } from '../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js';

async function configureImageClassification(project) {
  let response = await fetchCredentials(`/rest/MediaTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Images",
      dtype: "image",
      attribute_types: [
        {
          name: "Label",
          description: "Image classification label.",
          dtype: "string",
          order: 0,
        },
      ],
    }),
  }).then(response => response.json());
  console.log(response.message);
}

async function configureObjectDetection(project) {
  let response = await fetchCredentials(`/rest/MediaTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Images",
      dtype: "image",
      attribute_types: [],
    }),
  }).then(response => response.json());
  console.log(response.message);
  const imageTypeId = response.id;

  response = await fetchCredentials(`/rest/MediaTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Videos",
      dtype: "video",
      attribute_types: [],
    }),
  });
  console.log(response.message);
  const videoTypeId = response.id;

  response = await fetchCredentials(`/rest/LocalizationTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Boxes",
      dtype: "box",
      media_types: [imageTypeId, videoTypeId],
      attribute_types: [
        {
          name: "Label",
          description: "Object detection label.",
          dtype: "string",
          order: 0,
        },
      ],
    }),
  });
  console.log(response.message);
}

async function configureMultiObjectTracking(project) {
  let response = await fetchCredentials(`/rest/MediaTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Videos",
      dtype: "video",
      attribute_types: [],
    }),
  });
  console.log(response.message);
  const videoTypeId = response.id;

  response = await fetchCredentials(`/rest/StateTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Tracks",
      association: "Localization",
      interpolation: "none",
      media_types: [videoTypeId],
      attribute_types: [
        {
          name: "Label",
          description: "Track label.",
          dtype: "string",
          order: 0,
        },
      ],
    }),
  });
  console.log(response.message);

  response = await fetchCredentials(`/rest/LocalizationTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Boxes",
      dtype: "box",
      media_types: [videoTypeId],
      attribute_types: [],
    }),
  });
}

async function configureActivityRecognition(project) {
  let response = await fetchCredentials(`/rest/MediaTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Videos",
      dtype: "video",
      attribute_types: [],
    }),
  });
  console.log(response.message);
  const videoTypeId = response.id;

  response = await fetchCredentials(`/rest/StateTypes/${project.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Activities",
      association: "Frame",
      interpolation: "latest",
      media_types: [videoTypeId],
      attribute_types: [
        {
          name: "Something in view",
          description: "Whether something is happening in the video.",
          dtype: "bool",
          order: 0,
        },
      ],
    }),
  });
  console.log(response.message);
}

const store = create(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    projects: [],
    organizations: [],
    init: async () => {
      Promise.all([
        fetchCredentials(`/rest/User/GetCurrent`, {}, true)
          .then((response) => response.json()),
        fetchCredentials('/rest/Announcements', {}, true)
          .then((response) => response.json()),
        fetchCredentials('/rest/Projects', {}, true)
          .then((response) => response.json()),
        fetchCredentials('/rest/Organizations', {}, true)
          .then((response) => response.json()),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          projects: values[2],
          organizations: values[3],
        });
      });
    },
    addProject: async (projectSpec, preset) => {
      let response = await fetchCredentials(`/rest/Projects`, {
        method: "POST",
        body: JSON.stringify(projectSpec),
      }).then(response => response.json());
      const project = response.object;
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
          await configureActivityRecognition(project);
          break;
        case "none":
          break;
        default:
          console.error(`Invalid preset: ${preset}`);
      }
      set({ projects: [...get().projects, project] }); // `push` doesn't trigger state update
      return project;
    },
    removeProject: async (id) => {
      const response = await fetchCredentials(`/rest/Project/${id}`, {
        method: "DELETE"
      }).then(response => response.json());
      console.log(response.message);
      set({ projects: get().projects.filter((project) => project.id != id) });
    },
  }))
);

export { store };
