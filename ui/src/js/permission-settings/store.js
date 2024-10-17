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
    User: {
      init: false,
      data: null,
      map: null,
    },
    Group: {
      init: false,
      data: null,
      map: null,
      groupIdUserIdMap: null,
      userIdGroupIdMap: null,
    },
    groupViewBy: "Group",

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
      const organizationList = await fetchCredentials(
        `/rest/Organizations`,
        {},
        true
      ).then((response) => response.json());

      set({ organizationList });

      return organizationList;
    },

    setGroupData: async (organizationId) => {
      let data = [];
      let map = new Map();
      let groupIdUserIdMap = new Map();
      let userIdGroupIdMap = new Map();

      const Group = get().Group;

      const groupList = await fetchCredentials(
        `/rest/Groups/${organizationId}`,
        {},
        true
      ).then((response) => response.json());

      if (Group.data && Group.data.length) {
        data = [...Group.data];
      }
      data.push(...groupList);

      if (Group.map && Group.map.size) {
        map = new Map(Group.map);
      }
      groupList.forEach((gr) => {
        map.set(gr.id, gr);
      });

      if (Group.groupIdUserIdMap && Group.groupIdUserIdMap.size) {
        groupIdUserIdMap = new Map(Group.groupIdUserIdMap);
      }
      groupList.forEach((gr) => {
        groupIdUserIdMap.set(gr.id, gr.members);
      });

      if (Group.userIdGroupIdMap && Group.userIdGroupIdMap.size) {
        userIdGroupIdMap = new Map(Group.userIdGroupIdMap);
      }
      groupList.forEach((gr) => {
        gr.members.forEach((userId) => {
          if (!userIdGroupIdMap.has(userId)) {
            userIdGroupIdMap.set(userId, []);
          }
          userIdGroupIdMap.get(userId).push(gr.id);
        });
      });

      set({
        Group: {
          init: true,
          data,
          map,
          groupIdUserIdMap,
          userIdGroupIdMap,
        },
      });
    },

    setUserData: async () => {
      if (!get().Group.map || !get().Group.map.size) return;

      let data = [];
      let map = new Map();

      const { userIdGroupIdMap } = get().Group;

      if (get().User.map && get().User.map.size) {
        map = new Map(get().User.map);
      }
      for (const userId of userIdGroupIdMap.keys()) {
        const userData = await fetchCredentials(
          `/rest/User/${userId}`,
          {},
          true
        ).then((response) => response.json());
        data.push(userData);
        map.set(userId, userData);
      }

      set({
        User: {
          init: true,
          data,
          map,
        },
      });
    },

    setSelection: (selectedType) => {
      set({ selectedType });
    },

    setGroupViewBy: (groupViewBy) => {
      set({ groupViewBy });
    },
  }))
);

export { listResources, detailResources, store };
