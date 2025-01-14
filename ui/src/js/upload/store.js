import create from "../../../node_modules/zustand/esm/vanilla.mjs";
import { subscribeWithSelector } from "../../../node_modules/zustand/esm/middleware.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

const store = create(
	subscribeWithSelector((set, get) => ({
		user: null,
		announcements: [],
		project: [],
		mediaTypes: [],
		organizations: [],
		mediaTypeSettings: [],
		uploadChunkProgress: 0, // Upload progress on current file
		uploadCurrentFile: "", // Name of file currently being uploaded
		uploadTotalFiles: 0, // Number of files being uploaded
		uploadFilesCompleted: 0, // Number of files that have been uploaded
		uploadError: "", // Most recent upload error message
		uploadCancelled: false, // Whether uploads have been cancelled
		uploadFoldersCompleted: 0,
		uploadTotalFolders: 0,
		sections: [],
		uploadInformation: {
			files: [],
			folders: [],
			errors: [],
			complete: false,
		},
		uploadCancel: () => {
			set({
				uploadChunkProgress: 0, // Upload progress on current file
				uploadCurrentFile: "", // Name of file currently being uploaded
				uploadTotalFiles: 0, // Number of files being uploaded
				uploadFilesCompleted: 0, // Number of files that have been uploaded
				uploadError: "", // Most recent upload error message
				uploadCancelled: false, // Whether uploads have been cancelled
				uploadFoldersCompleted: 0,
				uploadTotalFolders: 0,
			});
		},
		init: async () => {
			const projectId = Number(window.location.pathname.split("/")[1]);
			return Promise.all([
				fetchCredentials(`/rest/User/GetCurrent`, {}, true).then((response) =>
					response.json()
				),
				fetchCredentials("/rest/Announcements", {}, true).then((response) =>
					response.json()
				),
				fetchCredentials("/rest/Project/" + projectId, {}, true).then(
					(response) => response.json()
				),
				fetchCredentials(`/rest/MediaTypes/${projectId}`, {}, true).then(
					(response) => response.json()
				),
				fetchCredentials(`/rest/Sections/${projectId}`, {}, true).then(
					(response) => response.json()
				),
			]).then((values) => {
				const setObj = {
					user: values[0],
					announcements: values[1],
					project: values[2],
					mediaTypes: values[3],
					sections: values[4],
				};
				set(setObj);

				return setObj;
			});
		},
	}))
);

export { store };
