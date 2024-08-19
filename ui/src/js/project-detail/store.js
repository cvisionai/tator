import create from 'https://cdn.jsdelivr.net/npm/zustand@4.5.5/vanilla/+esm';
import { subscribeWithSelector } from 'https://cdn.jsdelivr.net/npm/zustand@4.5.5/middleware/+esm';

const store = create(
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
        fetchCredentials(`/rest/User/GetCurrent`, {}, true)
          .then((response) => response.json()),
        fetchCredentials('/rest/Announcements', {}, true)
          .then((response) => response.json()),
        fetchCredentials('/rest/Project/' + projectId, {}, true)
          .then((response) => response.json()),
        fetchCredentials('/rest/MediaTypes', {}, true)
          .then((response) => response.json()),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          project: values[2],
          mediaTypes: values[3],
        });
      });
    },
  }))
);

export { store };
