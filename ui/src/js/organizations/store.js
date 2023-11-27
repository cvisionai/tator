import { create } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
import { getApi } from "../../../../scripts/packages/tator-js/pkg/src/index.js";

const api = getApi();

const store = create(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    init: async () => {
      Promise.all([
        api.whoami(),
        api.getAnnouncementList(),
        api.getOrganizationList(),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          organizations: values[2],
        });
      });
    },
    addOrganization: async (organizationSpec) => {
      let response = await api.createOrganization(organizationSpec);
      const organizatioId = response.id;
      const organization = await api.getOrganization(organizatioId);

      set({ organizations: [...get().organizations, organization] }); // `push` doesn't trigger state update
      return organization;
    },
    removeOrganization: async (id) => {
      const response = await api.deleteOrganization(id);
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
