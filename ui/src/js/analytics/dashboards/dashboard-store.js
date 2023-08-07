import { create } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
import { getApi } from "../../../../../scripts/packages/tator-js/pkg/src/index.js";

const api = getApi();
const projectId = window.location.pathname.split("/")[1];
const dashboardId = window.location.pathname.split("/")[3];

const store = create(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    project: null,
    dashboard: null,
    init: async () => {
      Promise.all([
        api.whoami(),
        api.getAnnouncementList(),
        api.getProject(projectId),
        api.getApplet(dashboardId),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          project: values[2],
          dashboard: values[3],
        });
      });
    },
  }))
);

export { store };
