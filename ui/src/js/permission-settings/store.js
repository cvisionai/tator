import create from "../../../node_modules/zustand/esm/vanilla.mjs";
import { subscribeWithSelector } from "../../../node_modules/zustand/esm/middleware.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

const listResources = {
  Group: "Groups",
  Policy: "RowProtections",
};

const detailResources = {
  Group: "Group",
  Policy: "RowProtection",
};

const store = create(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    organizationList: [],
    selectedType: "",

    initHeader: async () => {
      Promise.all([
        fetchCredentials(`/rest/User/GetCurrent`, {}, true).then((response) =>
          response.json()
        ),
        fetchCredentials("/rest/Announcements", {}, true).then((response) =>
          response.json()
        ),
      ]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
          // isStaff: values[0].is_staff,
        });
      });
    },

    getOrganizationList: async () => {
      set({
        organizationList: await fetchCredentials(
          `/rest/Organizations`,
          {},
          true
        ).then((response) => response.json()),
      });
    },

    /* */
    setSelection: (newSelection) => {
      set({
        selection: newSelection,
      });
    },
  }))
);

export { listResources, detailResources, store };
