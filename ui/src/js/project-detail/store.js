import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
import { getApi } from "../../../../scripts/packages/tator-js/pkg/src/index.js";
import { Utilities } from '../util/utilities.js'
const api = getApi();

const store = createStore(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    project: [],
    mediaTypes: [],
    organizations: [],
    uploadChunkProgress: 0, // Upload progress on current file
    uploadCurrentFile: "", // Name of file currently being uploaded
    uploadTotalFiles: 0, // Number of files being uploaded
    uploadFilesCompleted: 0, // Number of files that have been uploaded
    uploadError: "", // Most recent upload error message
    uploadCancelled: false, // Whether uploads have been cancelled
    uploadCancel: () => {
      set({
        uploadChunkProgress: 0,
        uploadCurrentFile: "",
        uploadTotalFiles: 0,
        uploadError: "",
        uploadCancelled: true,
      });
    },
    init: async () => {
      const projectId = Number(window.location.pathname.split("/")[1]);
      Promise.all([
        api.whoami(),
        api.getAnnouncementList(),
        api.getProject(projectId),
        api.getMediaTypeList(projectId),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          project: values[2],
          mediaTypes: values[3],
        });
      }).catch((err) => {
        if (err?.body?.message) {
          Utilities.warningAlert(err.body.message, "red", true);
        } else {
          Utilities.warningAlert("Error initializing data.", "red", true);
        }

        setTimeout(() => {
          window.location.href = "/projects";
        }, 1500);
      });
    },
  }))
);

export { store, api };
