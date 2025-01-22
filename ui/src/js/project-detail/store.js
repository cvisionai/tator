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

		init: async () => {
			const projectId = Number(window.location.pathname.split("/")[1]);
			Promise.all([
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
