import create from '../../../node_modules/zustand/esm/vanilla.mjs';
import { subscribeWithSelector } from '../../../node_modules/zustand/esm/middleware.js';
import { fetchCredentials } from '../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js';

const store = create(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    init: async () => {
      Promise.all([
        fetchCredentials(`/rest/User/GetCurrent`, {}, true)
          .then((response) => response.json()),
        fetchCredentials('/rest/Announcements', {}, true)
          .then((response) => response.json()),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
        });
      });
    },
  }))
);

export { store };
