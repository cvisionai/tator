import { createStore } from "../../../../node_modules/zustand/esm/vanilla.mjs";
import { subscribeWithSelector } from "../../../../node_modules/zustand/esm/middleware.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

const projectId = window.location.pathname.split("/")[1];

const store = createStore(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    project: null,
    dashboard: null,
    init: async () => {
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
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          project: values[2],
        });
      });
    },
  }))
);

export { store };
