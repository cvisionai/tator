import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { getApi } from '../../../../scripts/packages/tator-js/pkg/src/index.js';

const api = getApi(window.localStorage.getItem('backend'));

const store = create(subscribeWithSelector((set, get) => ({
  user: null,
  announcements: [],
  project: [],
  mediaTypes: [],
  organizations: [],
  uploads: [],
  init: async () => {
    const projectId = Number(window.location.pathname.split('/')[1]);
    Promise.all([
      api.whoami(),
      api.getAnnouncementList(),
      api.getProject(projectId),
      api.getMediaTypeList(projectId),
    ])
    .then((values) => {
      set({
        user: values[0],
        announcements: values[1],
        project: values[2],
        mediaTypes: values[3],
      });
    });
  },
})));

export {store, api};

