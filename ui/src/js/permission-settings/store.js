import create from "../../../node_modules/zustand/esm/vanilla.mjs";
import { subscribeWithSelector } from "../../../node_modules/zustand/esm/middleware.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { data as policy, noPer } from "./test.js";

const listResources = {
  section: "Sections",
  project: "Projects",
};
const detailResources = {
  section: "Section",
  project: "Project",
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

export async function fetchWithHttpInfo(url, options, retry = false) {
  const response = await fetchCredentials(url, options);
  return { response: response, data: await response.json() };
}

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
        filter: [],
        sortBy: {
          groupName: "",
        },
        pagination: {},
      },
      User: {
        filter: [],
        sortBy: {
          userId: "",
        },
        pagination: {},
      },
    },

    Policy: {
      init: false,
      data: null,
      processedData: null,
      map: null,
      processedMap: null,
      noPermissionEntities: [],
    },
    tabularPolicy: {
      count: 0,
      data: null,
    },
    selectedPolicyIds: [],
    policySearchParams: {
      filter: [],
      sortBy: {
        entityName: "",
        targetName: "",
      },
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

      const { groupIdGroupNameMap, groupIdUserIdMap } = get().Group;
      let filteredGroupIdGroupNameMap = new Map(groupIdGroupNameMap);
      let filteredGroupIdUserIdMap = new Map(groupIdUserIdMap);

      // Filter
      viewByGroupSearchParams.filter.forEach((con) => {
        switch (con.category) {
          case "groupName":
            switch (con.modifier) {
              case "includes":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (!groupName.includes(con.value)) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "equals":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (groupName !== con.value) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "starts with":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (!groupName.startsWith(con.value)) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "ends with":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (!groupName.endsWith(con.value)) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "not equal":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (groupName === con.value) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
            }
            break;
          case "groupId":
            switch (con.modifier) {
              case "==":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (groupId !== con.value) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "!=":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (groupId === con.value) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case ">=":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (groupId < con.value) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "<=":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (groupId > con.value) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "in":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (!con.value.includes(groupId)) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
            }
            break;
          case "userId":
            switch (con.modifier) {
              case "==":
                for (let [groupId, userIds] of filteredGroupIdUserIdMap) {
                  if (!userIds.includes(con.value)) {
                    filteredGroupIdUserIdMap.delete(groupId);
                  }
                }
                break;
              case "!=":
                for (let [groupId, userIds] of filteredGroupIdUserIdMap) {
                  if (userIds.includes(con.value)) {
                    filteredGroupIdUserIdMap.delete(groupId);
                  }
                }
                break;
              case ">=":
                for (let [groupId, userIds] of filteredGroupIdUserIdMap) {
                  if (userIds.every((id) => id < con.value)) {
                    filteredGroupIdUserIdMap.delete(groupId);
                  }
                }
                break;
              case "<=":
                for (let [groupId, userIds] of filteredGroupIdUserIdMap) {
                  if (userIds.every((id) => id > con.value)) {
                    filteredGroupIdUserIdMap.delete(groupId);
                  }
                }
                break;
              case "in":
                for (let [groupId, userIds] of filteredGroupIdUserIdMap) {
                  if (userIds.every((id) => !con.value.includes(id))) {
                    filteredGroupIdUserIdMap.delete(groupId);
                  }
                }
                break;
            }
            break;
        }
      });
      // a group id must be in both filteredGroupIdGroupNameMap and filteredGroupIdUserIdMap
      // So that it meets all filter conditions
      for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
        if (!filteredGroupIdUserIdMap.has(groupId)) {
          filteredGroupIdGroupNameMap.delete(groupId);
        }
      }
      // Now filteredGroupIdGroupNameMap meets all filter conditions
      const count = filteredGroupIdGroupNameMap.size;

      // Sort
      let sortedGroupIdGroupNameMap = null;
      if (viewByGroupSearchParams.sortBy.groupName === "ascending") {
        sortedGroupIdGroupNameMap = new Map(
          [...filteredGroupIdGroupNameMap.entries()].sort((a, b) =>
            a[1].localeCompare(b[1])
          )
        );
      } else if (viewByGroupSearchParams.sortBy.groupName === "descending") {
        sortedGroupIdGroupNameMap = new Map(
          [...filteredGroupIdGroupNameMap.entries()].sort((a, b) =>
            b[1].localeCompare(a[1])
          )
        );
      } else {
        sortedGroupIdGroupNameMap = new Map([
          ...filteredGroupIdGroupNameMap.entries(),
        ]);
      }

      // Paginate
      const paginatedEntries = new Map(
        [...sortedGroupIdGroupNameMap.entries()].slice(
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

      const { groupIdGroupNameMap, userIdGroupIdMap } = get().Group;
      let filteredGroupIdGroupNameMap = new Map(groupIdGroupNameMap);
      let filteredUserIdGroupIdMap = new Map(userIdGroupIdMap);

      // Filter
      viewByUserSearchParams.filter.forEach((con) => {
        switch (con.category) {
          case "groupName":
            switch (con.modifier) {
              case "includes":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (!groupName.includes(con.value)) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "equals":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (groupName !== con.value) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "starts with":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (!groupName.startsWith(con.value)) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "ends with":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (!groupName.endsWith(con.value)) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
              case "not equal":
                for (let [groupId, groupName] of filteredGroupIdGroupNameMap) {
                  if (groupName === con.value) {
                    filteredGroupIdGroupNameMap.delete(groupId);
                  }
                }
                break;
            }
            break;
          case "groupId":
            switch (con.modifier) {
              case "==":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (!groupIds.includes(con.value)) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
              case "!=":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (groupIds.includes(con.value)) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
              case ">=":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (groupIds.every((id) => id < con.value)) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
              case "<=":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (groupIds.every((id) => id > con.value)) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
              case "in":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (groupIds.every((id) => !con.value.includes(id))) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
            }
            break;
          case "userId":
            switch (con.modifier) {
              case "==":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (userId !== con.value) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
              case "!=":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (userId === con.value) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
              case ">=":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (userId < con.value) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
              case "<=":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (userId > con.value) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
              case "in":
                for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
                  if (!con.value.includes(userId)) {
                    filteredUserIdGroupIdMap.delete(userId);
                  }
                }
                break;
            }
            break;
        }
      });
      // a group id must be in both filteredGroupIdGroupNameMap and filteredUserIdGroupIdMap
      // So that it meets all filter conditions
      const groupIdWithFilteredName = Array.from(
        filteredGroupIdGroupNameMap.keys()
      );
      for (let [userId, groupIds] of filteredUserIdGroupIdMap) {
        const hasSameGroupId = groupIds.some((id) =>
          groupIdWithFilteredName.includes(id)
        );
        if (!hasSameGroupId) {
          filteredUserIdGroupIdMap.delete(userId);
        }
      }
      // Now filteredUserIdGroupIdMap meets all filter conditions
      const count = filteredUserIdGroupIdMap.size;

      // Sort
      let sortedUserIdGroupIdMap = null;
      if (viewByUserSearchParams.sortBy.userId === "ascending") {
        sortedUserIdGroupIdMap = new Map(
          [...filteredUserIdGroupIdMap.entries()].sort((a, b) => a[0] - b[0])
        );
      } else if (viewByUserSearchParams.sortBy.userId === "descending") {
        sortedUserIdGroupIdMap = new Map(
          [...filteredUserIdGroupIdMap.entries()].sort((a, b) => b[0] - a[0])
        );
      } else {
        sortedUserIdGroupIdMap = new Map([
          ...filteredUserIdGroupIdMap.entries(),
        ]);
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
      let noPermissionEntities = [];

      const { user, groupList, organizationList } = get();

      // const userPolicyList = await fetchCredentials(
      //   `/rest/RowProtections?user=${user.id}`,
      //   {}
      // ).then((response) => response.json());
      // data.push(...userPolicyList);

      // for (const gr of groupList) {
      //   const groupPolicyList = await fetchCredentials(
      //     `/rest/RowProtections?group=${gr.id}`,
      //     {}
      //   ).then((response) => response.json());
      //   // When user is not allowed to get a permission item, the data sent back is not an array
      //   if (!Array.isArray(groupPolicyList)) {
      //     noPermissionEntities.push(["group", gr.id]);
      //     continue;
      //   }
      //   data.push(...groupPolicyList);
      // }

      // for (const org of organizationList) {
      //   const organizationPolicyList = await fetchCredentials(
      //     `/rest/RowProtections?organization=${org.id}`,
      //     {}
      //   ).then((response) => response.json());
      //   // When user is not allowed to get a permission item, the data sent back is not an array
      //   if (!Array.isArray(organizationPolicyList)) {
      //     noPermissionEntities.push(["group", gr.id]);
      //     continue;
      //   }
      //   data.push(...organizationPolicyList);
      // }
      data = policy;
      noPermissionEntities = noPer;

      data.forEach((policy) => {
        map.set(policy.id, policy);
      });

      processedData = get().processPolicyData(data);
      processedData.forEach((pd) => {
        processedMap.set(pd.id, pd);
      });

      set({
        Policy: {
          init: true,
          data,
          processedData,
          map,
          processedMap,
          noPermissionEntities,
        },
      });
    },

    setTabularPolicy: () => {
      const { policySearchParams } = get();

      const { processedMap } = get().Policy;
      let filteredProcessedMap = new Map(processedMap);

      // Filter
      policySearchParams.filter.forEach((con) => {
        switch (con.category) {
          case "entityType":
          case "targetType":
            switch (con.modifier) {
              case "equals":
                for (let [policyId, policy] of filteredProcessedMap) {
                  if (policy[con.category] !== con.value) {
                    filteredProcessedMap.delete(policyId);
                  }
                }
                break;
              case "not equal":
                for (let [policyId, policy] of filteredProcessedMap) {
                  if (policy[con.category] === con.value) {
                    filteredProcessedMap.delete(policyId);
                  }
                }
                break;
            }
            break;
          case "entityId":
          case "targetId":
            switch (con.modifier) {
              case "==":
                for (let [policyId, policy] of filteredProcessedMap) {
                  if (policy[con.category] !== con.value) {
                    filteredProcessedMap.delete(policyId);
                  }
                }
                break;
              case "!=":
                for (let [policyId, policy] of filteredProcessedMap) {
                  if (policy[con.category] === con.value) {
                    filteredProcessedMap.delete(policyId);
                  }
                }
                break;
              case ">=":
                for (let [policyId, policy] of filteredProcessedMap) {
                  if (policy[con.category] < con.value) {
                    filteredProcessedMap.delete(policyId);
                  }
                }
                break;
              case "<=":
                for (let [policyId, policy] of filteredProcessedMap) {
                  if (policy[con.category] > con.value) {
                    filteredProcessedMap.delete(policyId);
                  }
                }
                break;
              case "in":
                for (let [policyId, policy] of filteredProcessedMap) {
                  if (!con.value.includes(policy[con.category])) {
                    filteredProcessedMap.delete(policyId);
                  }
                }
                break;
            }
            break;
        }
      });
      const count = filteredProcessedMap.size;

      // Sort
      let sortedProcessedMap = null;
      sortedProcessedMap = new Map(
        [...filteredProcessedMap.entries()].sort((a, b) => {
          const sortBy = policySearchParams.sortBy;

          if (sortBy.entityName === "ascending") {
            return a[1].entityName.localeCompare(b[1].entityName);
          } else if (sortBy.entityName === "descending") {
            return b[1].entityName.localeCompare(a[1].entityName);
          } else if (sortBy.targetName === "ascending") {
            return a[1].targetName.localeCompare(b[1].targetName);
          } else if (sortBy.targetName === "descending") {
            return b[1].targetName.localeCompare(a[1].targetName);
          } else {
            return 0;
          }
        })
      );

      // Paginate
      const paginatedEntries = new Map(
        [...sortedProcessedMap.entries()].slice(
          policySearchParams.pagination.start,
          policySearchParams.pagination.stop
        )
      );

      // Set data
      const data = [];
      for (let [policyId, policy] of paginatedEntries) {
        data.push(policy);
      }

      set({
        tabularPolicy: {
          count,
          data,
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

    getCalculatorPolicies: async (targets) => {
      const policies = [];
      for (const target of targets) {
        try {
          const info = await fetchWithHttpInfo(
            `/rest/RowProtections?${target[0]}=${target[1]}`
          );

          if (info.response.ok) {
            policies.push(...info.data);
          } else if (!info.response.ok && info.response.status === 403) {
            policies.push({ [target[0]]: target[1], permission: -1 });
          }
        } catch (error) {
          console.error(error);
        }
      }

      const processedPolicies = get().processPolicyData(policies);

      return processedPolicies;
    },

    processPolicyData: (data) => {
      return data.map((policy) => {
        let processedObj = null;

        const entityType = POLICY_ENTITY_TYPE.find(
          (en) => policy[en] != undefined
        );
        const targetType = POLICY_TARGET_TYPE.find(
          (ta) => policy[ta] != undefined
        );
        const entityName = `${POLICY_ENTITY_NAME[entityType]} ${policy[entityType]}`;
        const targetName = `${POLICY_TARGET_NAME[targetType]} ${policy[targetType]}`;

        if (policy.permission === -1) {
          processedObj = {
            id: null,
            entityName: "ALL",
            targetName,
            permission: policy.permission,
            entityType: "ALL",
            targetType,
            entityId: "ALL",
            targetId: policy[targetType],
          };
        } else {
          processedObj = {
            id: policy.id,
            entityName,
            targetName,
            permission: policy.permission,
            entityType,
            targetType,
            entityId: policy[entityType],
            targetId: policy[targetType],
          };
        }

        return processedObj;
      });
    },

    findUsers: async (inputList) => {
      const notFound = [];
      const found = new Map();

      for (let input of inputList) {
        const users = await fetchCredentials(
          `/rest/Users?${
            input.indexOf("@") > -1 ? "email" : "username"
          }=${encodeURIComponent(input)}`,
          {},
          true
        ).then((response) => response.json());

        if (users.length) {
          for (const user of users) {
            found.set(user.id, user);
          }
        } else {
          notFound.push(input);
        }
      }

      return { found, notFound };
    },

    findUserById: async (id) => {
      const user = await fetchCredentials(`/rest/User/${id}`, {}, true).then(
        (response) => response.json()
      );

      if (user.id && !user.message) {
        return user;
      } else {
        return null;
      }
    },

    createGroup: async (orgId, data) => {
      try {
        const fn = async (orgId, body) => {
          return await fetchWithHttpInfo(`/rest/Groups/${orgId}`, {
            method: "POST",
            body: JSON.stringify(body),
          });
        };
        const responseInfo = await fn(orgId, data);

        // This includes the reponse so error handling can happen in ui
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },

    updateGroup: async (groupId, data) => {
      try {
        const fn = async (groupId, body) => {
          return await fetchWithHttpInfo(`/rest/Group/${groupId}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        };
        const responseInfo = await fn(groupId, data);

        // This includes the reponse so error handling can happen in ui
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },

    deleteGroup: async (groupId) => {
      try {
        const fn = async (groupId) => {
          return await fetchWithHttpInfo(`/rest/Group/${groupId}`, {
            method: "DELETE",
          });
        };
        const responseInfo = await fn(groupId);

        // This includes the reponse so error handling can happen in ui
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },

    createPolicy: async (data) => {
      try {
        const fn = async (body) => {
          return await fetchWithHttpInfo(`/rest/RowProtections`, {
            method: "POST",
            body: JSON.stringify(body),
          });
        };
        const responseInfo = await fn(data);

        // This includes the reponse so error handling can happen in ui
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },

    updatePolicy: async (policyId, data) => {
      try {
        const fn = async (policyId, body) => {
          return await fetchWithHttpInfo(`/rest/RowProtection/${policyId}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        };
        const responseInfo = await fn(policyId, data);

        // This includes the reponse so error handling can happen in ui
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },

    deletePolicy: async (policyId) => {
      try {
        const fn = async (policyId) => {
          return await fetchWithHttpInfo(`/rest/RowProtection/${policyId}`, {
            method: "DELETE",
          });
        };
        const responseInfo = await fn(policyId);

        // This includes the reponse so error handling can happen in ui
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
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

    setSelectedPolicyIds: (selectedPolicyIds) => {
      set({ selectedPolicyIds });
    },

    setPolicySearchParams: (policySearchParams) => {
      set({ policySearchParams });
    },
  }))
);

export { POLICY_ENTITY_NAME, POLICY_TARGET_NAME, store };
