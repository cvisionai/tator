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

const POLICY_ENTITY_NAME = {
  user: "User",
  organization: "Organization",
  group: "Group",
};
const POLICY_TARGET_NAME = {
  project: "Project",
  media: "Media",
  localization: "Localization",
  state: "State",
  file: "File",
  section: "Section",
  algorithm: "Algorithm",
  version: "Version",
  target_organization: "Organization",
  target_group: "Group",
  job_cluster: "Job Cluster",
  bucket: "Bucket",
  hosted_template: "Hosted Template",
};
const POLICY_ENTITY_TYPE = Object.keys(POLICY_ENTITY_NAME);
const POLICY_TARGET_TYPE = Object.keys(POLICY_TARGET_NAME);

const store = create(
  subscribeWithSelector((set, get) => ({
    announcements: [],

    user: null,
    groupList: [],
    organizationList: [],

    selectedType: {
      typeName: "Group",
      typeId: "All",
    },

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
      groupIdGroupNameMap: null,
      userIdGroupIdMap: null,
    },
    tabularGroup: {
      Group: {
        count: 0,
        data: null,
      },
      User: {
        count: 0,
        userIdGroupIdMap: null,
      },
    },
    selectedGroupIds: [],
    groupViewBy: "Group",
    groupSearchParams: {
      Group: {
        filter: {},
        sortBy: {},
        pagination: {},
      },
      User: {
        filter: {},
        sortBy: {},
        pagination: {},
      },
    },

    Policy: {
      init: false,
      data: null,
      processedData: null,
      map: null,
      processedMap: null,
    },
    tabularPolicy: {
      count: 0,
      data: null,
    },
    policySearchParams: {
      filter: {},
      sortBy: {},
      pagination: {},
    },

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

    getCurrentUserGroupList: async () => {
      let groupList = [];

      const { organizationList, user } = get();

      for (const org of organizationList) {
        const data = await fetchCredentials(
          `/rest/Groups/${org.id}?user=${user.id}`,
          {},
          true
        ).then((response) => response.json());
        groupList.push(...data);
      }

      set({ groupList });
    },

    getOrganizationList: async () => {
      const organizationList = await fetchCredentials(
        `/rest/Organizations`,
        {},
        true
      ).then((response) => response.json());

      set({ organizationList });
    },

    setGroupData: async () => {
      let data = [];
      let map = new Map();
      let groupIdUserIdMap = new Map();
      let groupIdGroupNameMap = new Map();
      let userIdGroupIdMap = new Map();

      const { organizationList } = get();

      for (const org of organizationList) {
        const groupList = await fetchCredentials(
          `/rest/Groups/${org.id}`,
          {},
          true
        ).then((response) => response.json());
        data.push(...groupList);
      }

      data.forEach((gr) => {
        map.set(gr.id, gr);
        groupIdUserIdMap.set(gr.id, gr.members);
        groupIdGroupNameMap.set(gr.id, gr.name);
      });

      data.forEach((gr) => {
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
          groupIdGroupNameMap,
          userIdGroupIdMap,
        },
      });
    },

    setTabularGroup: (groupViewBy) => {
      if (groupViewBy === "Group") {
        get().setViewByGroupData();
      } else if (groupViewBy === "User") {
        get().setViewByUserData();
      }
    },

    setViewByGroupData: () => {
      const { Group: viewByGroupSearchParams } = get().groupSearchParams;

      const { groupIdGroupNameMap } = get().Group;
      // Filter
      //
      const count = groupIdGroupNameMap.size;

      // Sort
      let sortedUserIdGroupIdMap = null;
      if (viewByGroupSearchParams.sortBy.groupName === "ascending") {
        sortedUserIdGroupIdMap = new Map(
          [...groupIdGroupNameMap.entries()].sort((a, b) =>
            a[1].localeCompare(b[1])
          )
        );
      } else {
        sortedUserIdGroupIdMap = new Map(
          [...groupIdGroupNameMap.entries()].sort((a, b) =>
            b[1].localeCompare(a[1])
          )
        );
      }

      // Paginate
      const paginatedEntries = new Map(
        [...sortedUserIdGroupIdMap.entries()].slice(
          viewByGroupSearchParams.pagination.start,
          viewByGroupSearchParams.pagination.stop
        )
      );

      // Set data
      const { map } = get().Group;
      const data = [];
      for (let [groupId, groupName] of paginatedEntries) {
        data.push(map.get(groupId));
      }

      set({
        tabularGroup: {
          ...get().tabularGroup,
          Group: {
            count,
            data,
          },
        },
      });
    },

    setViewByUserData: () => {
      const { User: viewByUserSearchParams } = get().groupSearchParams;

      const { userIdGroupIdMap } = get().Group;
      // Filter
      //
      const count = userIdGroupIdMap.size;

      // Sort
      let sortedUserIdGroupIdMap = null;
      if (viewByUserSearchParams.sortBy.userId === "ascending") {
        sortedUserIdGroupIdMap = new Map(
          [...userIdGroupIdMap.entries()].sort((a, b) => a[0] - b[0])
        );
      } else {
        sortedUserIdGroupIdMap = new Map(
          [...userIdGroupIdMap.entries()].sort((a, b) => b[0] - a[0])
        );
      }

      // Paginate
      const paginatedEntries = new Map(
        [...sortedUserIdGroupIdMap.entries()].slice(
          viewByUserSearchParams.pagination.start,
          viewByUserSearchParams.pagination.stop
        )
      );

      // Set data
      set({
        tabularGroup: {
          ...get().tabularGroup,
          User: {
            count,
            userIdGroupIdMap: paginatedEntries,
          },
        },
      });
    },

    setPolicyData: async () => {
      let data = [];
      let processedData = [];
      let map = new Map();
      let processedMap = new Map();

      const { user, groupList, organizationList } = get();

      const userPolicyList = await fetchCredentials(
        `/rest/RowProtections?user=${user.id}`,
        {}
      ).then((response) => response.json());
      data.push(...userPolicyList);

      for (const gr of groupList) {
        const groupPolicyList = await fetchCredentials(
          `/rest/RowProtections?group=${gr.id}`,
          {}
        ).then((response) => response.json());
        if (!Array.isArray(groupPolicyList)) {
          continue;
        }
        data.push(...groupPolicyList);
      }

      for (const org of organizationList) {
        const organizationPolicyList = await fetchCredentials(
          `/rest/RowProtections?organization=${org.id}`,
          {}
        ).then((response) => response.json());
        if (!Array.isArray(organizationPolicyList)) {
          continue;
        }
        data.push(...organizationPolicyList);
      }

      data.forEach((policy) => {
        const entityType = POLICY_ENTITY_TYPE.find(
          (en) => policy[en] != undefined
        );
        const targetType = POLICY_TARGET_TYPE.find(
          (ta) => policy[ta] != undefined
        );
        const entityName = `${POLICY_ENTITY_NAME[entityType]} ${policy[entityType]}`;
        const targetName = `${POLICY_TARGET_NAME[targetType]} ${policy[targetType]}`;

        const processedObj = {
          id: policy.id,
          entityName,
          targetName,
          permission: policy.permission,
        };
        map.set(policy.id, policy);
        processedData.push(processedObj);
        processedMap.set(policy.id, processedObj);
      });

      set({
        Policy: {
          init: true,
          data,
          processedData,
          map,
          processedMap,
        },
      });
    },

    setTabularPolicy: () => {
      const { policySearchParams } = get();

      const { processedData } = get().Policy;

      // Filter
      //
      const count = processedData.length;

      // Sort
      let sortedProcessedData = null;
      sortedProcessedData = [...processedData].sort((a, b) => {
        const sortBy = policySearchParams.sortBy;

        if (sortBy.entityName === "ascending") {
          return a.entityName.localeCompare(b.entityName);
        } else if (sortBy.entityName === "descending") {
          return b.entityName.localeCompare(a.entityName);
        } else if (sortBy.targetName === "ascending") {
          return a.targetName.localeCompare(b.targetName);
        } else if (sortBy.targetName === "descending") {
          return b.targetName.localeCompare(a.targetName);
        }
      });

      // Paginate
      const paginatedData = [...sortedProcessedData].slice(
        policySearchParams.pagination.start,
        policySearchParams.pagination.stop
      );

      // Set data
      set({
        tabularPolicy: {
          count,
          data: paginatedData,
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

    setSelectedType: (selectedType) => {
      set({ selectedType });
    },

    setGroupViewBy: (groupViewBy) => {
      set({ groupViewBy });
    },

    setGroupSearchParams: (groupSearchParams) => {
      set({ groupSearchParams });
    },

    setSelectedGroupIds: (selectedGroupIds) => {
      set({ selectedGroupIds });
    },

    setPolicySearchParams: (policySearchParams) => {
      set({ policySearchParams });
    },
  }))
);

export { listResources, detailResources, store };
