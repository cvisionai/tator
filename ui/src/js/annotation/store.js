import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { getApi } from '../../../../scripts/packages/tator-js/pkg/src/index.js';

const api = getApi(window.localStorage.getItem('backend'));
const projectId = window.location.pathname.split("/")[1];
const mediaId = window.location.pathname.split("/")[3];

const store = create(subscribeWithSelector((set, get) => ({
  user: null,
  announcements: [],
  project: null,
  mediaId: null,
  init: async () => {
    Promise.all([
      api.whoami(),
      api.getAnnouncementList(),
      api.getProject(projectId),
    ])
    .then((values) => {
      set({
        user: values[0],
        announcements: values[1],
        project: values[2],
      });
    });
    set({mediaId: window.location.pathname.split("/")[3]});
  },
})));

export {store};

