import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { Utils } from '../../../../scripts/packages/tator-js/pkg/dist/tator.min.js';

const api = Utils.getApi(window.localStorage.getItem('backend'));

const store = create(subscribeWithSelector((set, get) => ({
  user: null,
  announcements: [],
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

export {store};

