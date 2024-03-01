// import create from "zustand/vanilla";
import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
import { getApi } from "../../../../../scripts/packages/tator-js/pkg/src/index.js";

const api = getApi();
const projectId = window.location.pathname.split("/")[1];

const store = createStore(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    project: null,
    init: async () => {
      console.log("INIT CALLED")
      return Promise.all([
        api.whoami(),
        api.getAnnouncementList(),
        api.getProject(projectId),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          project: values[2],
        });
        return {
          user: values[0],
          announcements: values[1],
          project: values[2],
        };
      });
    },
  }))
);

export { store };
