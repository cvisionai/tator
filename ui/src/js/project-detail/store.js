import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { getApi } from '../../../../scripts/packages/tator-js/pkg';

const api = getApi(window.localStorage.getItem('backend'));

const store = create(subscribeWithSelector((set, get) => ({
  user: null,
  announcements: [],
  project: [],
  organizations: [],
  uploads: [],
  init: async () => {
    Promise.all([
      api.whoami(),
      api.getAnnouncementList(),
    ])
    .then((values) => {
      set({
        user: values[0],
        announcements: values[1],
      });
    });
  },
})));

export {store, api};

