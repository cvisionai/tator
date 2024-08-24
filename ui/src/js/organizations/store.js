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
        fetchCredentials('/rest/Organizations', {}, true)
          .then((response) => response.json()),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          organizations: values[2],
        });
      });
    },
    addOrganization: async (organizationSpec) => {
      let response = await fetchCredentials(`/rest/Organizations`, {
        method: "POST",
        body: JSON.stringify(organizationSpec),
      }).then(response => response.json());
      const organizationId = response.id;
      const organization = await fetchCredentials(`/rest/Organization/${organizationId}`, {}, true)
        .then(response => response.json());

      set({ organizations: [...get().organizations, organization] }); // `push` doesn't trigger state update
      return organization;
    },
    removeOrganization: async (id) => {
      const response = await fetchCredentials(`/rest/Organizations/${id}`, {
        method: "DELETE",
      }).then(response => response.json());
      console.log(response.message);
      set({
        organizations: get().organizations.filter(
          (organization) => organization.id != id
        ),
      });
    },
  }))
);

export { store };
