import create from "zustand/vanilla";
import { subscribeWithSelector, devtools } from "zustand/middleware";
import { getApi } from "../../../../scripts/packages/tator-js/pkg/src/index.js";

const api = getApi(BACKEND);

const getMap = new Map();
getMap
  .set("Project", api.getProjectWithHttpInfo.bind(api))
  .set("MediaType", api.getMediaTypeListWithHttpInfo.bind(api))
  .set("LocalizationType", api.getLocalizationTypeListWithHttpInfo.bind(api))
  .set("LeafType", api.getLeafTypeListWithHttpInfo.bind(api))
  .set("Leaf", api.getLeafListWithHttpInfo.bind(api))
  .set("StateType", api.getStateTypeListWithHttpInfo.bind(api))
  .set("Membership", api.getMembershipListWithHttpInfo.bind(api))
  .set("Version", api.getVersionListWithHttpInfo.bind(api))
  .set("Algorithm", api.getAlgorithmListWithHttpInfo.bind(api))
  .set("JobCluster", api.getJobClusterListWithHttpInfo.bind(api))
  .set("Applet", api.getAppletListWithHttpInfo.bind(api))
  .set("User", api.getUserListWithHttpInfo.bind(api));

const postMap = new Map();
postMap
  .set("MediaType", api.createMediaTypeWithHttpInfo.bind(api))
  .set("LocalizationType", api.createLocalizationTypeWithHttpInfo.bind(api))
  .set("LeafType", api.createLeafTypeWithHttpInfo.bind(api))
  .set("Leaf", api.createLeafListWithHttpInfo.bind(api))
  .set("StateType", api.createStateTypeWithHttpInfo.bind(api))
  .set("Membership", api.createMembershipWithHttpInfo.bind(api))
  .set("Version", api.createVersionWithHttpInfo.bind(api))
  .set("Algorithm", api.registerAlgorithmWithHttpInfo.bind(api))
  .set("Applet", api.registerAppletWithHttpInfo.bind(api));

const patchMap = new Map();
patchMap
  .set("Project", api.updateProjectWithHttpInfo.bind(api))
  .set("MediaType", api.updateMediaTypeWithHttpInfo.bind(api))
  .set("LocalizationType", api.updateLocalizationTypeWithHttpInfo.bind(api))
  .set("LeafType", api.updateLeafTypeWithHttpInfo.bind(api))
  .set("Leaf", api.updateLeafWithHttpInfo.bind(api))
  .set("StateType", api.updateStateTypeWithHttpInfo.bind(api))
  .set("Membership", api.updateMembershipWithHttpInfo.bind(api))
  .set("Version", api.updateVersionWithHttpInfo.bind(api))
  .set("Algorithm", api.updateAlgorithmWithHttpInfo.bind(api))
  .set("Applet", api.updateAppletWithHttpInfo.bind(api));

const deleteMap = new Map();
deleteMap
  .set("Project", api.deleteProjectWithHttpInfo.bind(api))
  .set("MediaType", api.deleteMediaTypeWithHttpInfo.bind(api))
  .set("LocalizationType", api.deleteLocalizationTypeWithHttpInfo.bind(api))
  .set("LeafType", api.deleteLeafTypeWithHttpInfo.bind(api))
  .set("Leaf", api.deleteLeafWithHttpInfo.bind(api))
  .set("StateType", api.deleteStateTypeWithHttpInfo.bind(api))
  .set("Membership", api.deleteMembershipWithHttpInfo.bind(api))
  .set("Version", api.deleteVersionWithHttpInfo.bind(api))
  .set("Algorithm", api.deleteAlgorithmWithHttpInfo.bind(api))
  .set("Applet", api.deleteAppletWithHttpInfo.bind(api));

const store = create(
  subscribeWithSelector((set, get) => ({
    selection: {
      typeName: "",
      typeId: -1,
    },
    status: {
      // page status
      name: "idle",
      msg: "", // if Error this could trigger "toast" with message
    },
    projectId: Number(window.location.pathname.split("/")[1]),
    organizationId: null,
    deletePermission: false,
    isStaff: false,
    user: null,
    announcements: [],

    Project: {
      name: "Project",
      data: {},
      init: false,
      setList: new Set(),
      map: new Map(),
    },
    MediaType: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "MediaType",
      attribute_types: {},
    },
    LocalizationType: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "LocalizationType",
      attribute_types: {},
    },
    Leaf: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Leaf",
    },
    LeafType: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "LeafType",
      attribute_types: {},
      leavesMap: new Map(),
    },
    StateType: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "StateType",
      attribute_types: {},
    },
    Membership: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Membership",
      users: {},
    },
    Version: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Version",
    },
    Algorithm: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Algorithm",
      jobClusters: [],
      clusterPermission: null,
    },
    Applet: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Applet",
    },
    JobCluster: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "JobCluster",
    },

    JobClusterPermission: {
      userCantSee: false,
      userCantSave: false,
    },

    User: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Users",
    },

    /* Get current user */
    getUser: async (userId) => {
      const object = await api.getUserWithHttpInfo(userId);
      if (object.response.ok && object.data) {
        return object.data;
      }

      return null;
    },

    /* */
    setSelection: (newSelection) => {
      set({
        selection: {
          ...get().selection,
          ...newSelection,
        },
      });
    },

    /** */
    setJobClusterPermissions: async () => {
      try {
        if (get().organizationId) {
          const object = await get().fetchTypeByOrg("JobCluster");

          set({
            JobClusterPermission: {
              ...get().JobClusterPermission,
              userCantSee: object.response.status === "403",
              userCantSave:
                !get().isStaff &&
                (object.data == null || object.data.length == 0),
            },
          });

          // Success: Return status to idle (handles page spinner)
          set({ status: { ...get().status, name: "idle", msg: "" } });
          return object;
        }
      } catch (err) {
        console.error(err);
        // Success: Return status to idle (handles page spinner)
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return null;
      }
    },

    /**
     *
     */
    getData: async (type, id) => {
      if (!get()[type].init) await get().fetchType(type);
      const info = get()[type];
      return info.map.get(Number(id));
    },

    initHeader: async () => {
      Promise.all([api.whoami(), api.getAnnouncementList()]).then((values) => {
        console.log(values[0]);
        set({
          user: values[0],
          announcements: values[1],
          isStaff: values[0].is_staff,
        });
      });
    },

    /* project */
    setProjectData: async (id) => {
      set({
        status: {
          name: "pending",
          msg: "Fetching project data...",
        },
      });

      const object = await api.getProjectWithHttpInfo(id);
      const setList = get()["Project"].setList;
      const map = get()["Project"].map;

      setList.add(object.data.id);
      map.set(object.data.id, object.data);

      set({ projectId: id });
      set({ organizationId: object.data.organization });
      set({
        Project: {
          ...get().Project,
          init: true,
          setList,
          map,
          data: object.data,
        },
      });

      set({
        status: {
          name: "idle",
          msg: "",
        },
      });

      // As soon as we have the org ID
      await store.getState().setJobClusterPermissions();
    },

    /* Generic to allow for loop calls */
    initType: async (type) => {
      let init = get()[type].init;
      let data = null;

      if (!init) {
        data = await get().fetchType(type);
      } else {
        data = await get()[type];
      }

      return data;
    },

    fetchTypeByOrg: async (type) => {
      set({
        status: { ...get().status, name: "bg-fetch", msg: `Adding ${type}...` },
      });
      try {
        const fn = getMap.get(type);
        const orgId = get().organizationId;
        const object = await fn(orgId);

        if (object.response.ok) {
          const setList = new Set();
          const map = new Map();

          /* Add the data via loop to: setList and map */
          for (let item of object.data) {
            setList.add(item.id);
            map.set(item.id, item);
          }
          set({ [type]: { ...get()[type], setList, map, init: true } });

          // Success: Return status to idle (handles page spinner)
          set({ status: { ...get().status, name: "idle", msg: "" } });
        } else {
          console.error("Object response not ok for fetchType", object);
        }
        return object;
      } catch (err) {
        // Error: Return status to idle (handles page spinner)
        console.error("Fetch type by org hit an issue.", err);
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },

    fetchType: async (type) => {
      if (type == "JobCluster") return get().fetchTypeByOrg(type);
      set({
        status: { ...get().status, name: "bg-fetch", msg: `Adding ${type}...` },
      });
      try {
        const fn = getMap.get(type);
        const projectId = get().projectId;
        const object = await fn(projectId);

        if (object.response.ok) {
          const setList = new Set();
          const map = new Map();

          /* Add the data via loop to: setList and map */
          if (type == "Project") {
            setList.add(object.data.id);
            map.set(object.data.id, object.data);

            /* Project set like this to include a "data" attr */
            set({
              Project: {
                ...get().Project,
                init: true,
                setList,
                map,
                data: object.data,
              },
            });
          } else if (type == "Leaf") {
            const data = await getLeavesByParent({ object });
            set({
              [type]: {
                ...get()[type],
                setList,
                map: data.newMap,
                setList: data.newSetList,
                init: true,
              },
            });
          } else {
            for (let item of object.data) {
              setList.add(item.id);
              map.set(item.id, item);
            }
            set({ [type]: { ...get()[type], setList, map, init: true } });
          }

          // After LeafType is init, init Leaf (Keep here to avoid loop)
          if (type == "LeafType") {
            await get().initType("Leaf");
          }

          // Success: Return status to idle (handles page spinner)
          set({ status: { ...get().status, name: "idle", msg: "" } });
          return object.data;
        } else {
          console.error("Object response not ok for fetchType", object);
        }
      } catch (err) {
        // Error: Return status to idle (handles page spinner)
        console.error("Fetch type hit an issue.", err);
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },
    addType: async ({ type, data }) => {
      set({
        status: { ...get().status, name: "pending", msg: `Adding ${type}...` },
      });
      try {
        const fn = postMap.get(type);
        const projectId = get().projectId;
        const responseInfo = await fn(projectId, data);

        // Refresh the page data before setting the selection
        await get().fetchType(type);

        // Select the new type (non-Leaf) forms
        if (type === "Leaf") {
          // Try to reset selection to refresh the same page
          get().setSelection({ typeId: get().selection.typeId });
        } else {
          //Response should have the newly added ID
          let newID = responseInfo.data.id ? responseInfo.data.id : "New";
          window.location = `${window.location.origin}${window.location.pathname}#${type}-${newID}`;
        }

        set({ status: { ...get().status, name: "idle", msg: "" } });

        // This includes the reponse so error handling can happen in ui
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },
    updateType: async ({ type, id, data }) => {
      set({
        status: {
          ...get().status,
          name: "pending",
          msg: "Updating version...",
        },
      });
      try {
        const fn = patchMap.get(type);
        const responseInfo = await fn(id, data);

        // Assume object isn't returned, refetch type
        await get().fetchType(type);

        if (type === "Leaf") {
          get().setSelection({ typeId: get().selection.typeId });
        }

        set({ status: { ...get().status, name: "idle", msg: "" } });
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },
    removeType: async ({ type, id }) => {
      set({
        status: {
          ...get().status,
          name: "pending",
          msg: "Updating version...",
        },
      });
      try {
        const fn = deleteMap.get(type);
        const object = await fn(id);

        await get().fetchType(type);

        if (type === "Leaf") {
          get().setSelection({ typeId: get().selection.typeId });
        }

        return object;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },

    /**
     * Accepts a version ID
     * @param {int} id
     * @returns related state and localization counts
     */
    getCountsForVersion: async (id) => {
      try {
        const state = await api.getStateCount(get().projectId, {
          version: [id],
        });
        const loc = await api.getLocalizationCount(get().projectId, {
          version: [id],
        });
        const counts = { state, loc };
        return counts;
      } catch (err) {
        console.error(`Couldn't getCountsForVersion id ${id}`, err);
        return null;
      }
    },
  }))
);

/**
 * Returns a list usable for settings page's checkbox set
 * @param {Object} args
 * @returns
 */
export const getCompiledList = async ({ type, skip = null, check = null }) => {
  await store.getState().initType(type);
  const state = store.getState()[type];
  const newList = [];

  if (state) {
    for (let id of state.setList) {
      const item = store.getState()[type].map.get(id);
      if (typeof item !== "undefined" && id !== skip) {
        newList.push({
          id: item.id,
          value: item.id,
          name: item.name,
          label: item.name,
          checked:
            check === item.id ||
            (Array.isArray(check) && check.includes(item.id)),
          selected:
            check === item.id ||
            (Array.isArray(check) && check.includes(item.id)),
        });
      }
    }
  }

  return newList;
};

/**
 * Returns a list usable for attribute clone selection sets
 * @returns
 */
export const getAttributeDataByType = async () => {
  const attributeDataByType = {
    MediaType: {},
    LocalizationType: {},
    LeafType: {},
    StateType: {},
  };

  for (let type of Object.keys(attributeDataByType)) {
    const data = await store.getState().initType(type);
    const list = Array.isArray(data) ? data : data.map.values();
    for (let entity of list) {
      console.log(
        ` attributeDataByType[${type}][${entity.name}] = entity.attribute_types`,
        entity.attribute_types
      );
      attributeDataByType[type][entity.name] = entity.attribute_types;
    }
  }

  return attributeDataByType;
};

/**
 *
 * @param {*} param0
 * @returns
 */
export const getLeavesByParent = async ({ object }) => {
  const newMap = new Map();
  const newSetList = new Set();
  const leaves = object.data;
  // const leafTypes = await store.getState().initType("LeafType");

  for (let item of leaves) {
    // Add to setlist
    const parentId = item.type;
    newSetList.add(parentId);

    // Get existing array, or start new leaves array
    const leaves = newMap.has(parentId) ? newMap.get(parentId) : [];
    leaves.push(item);

    // setup data
    newMap.set(parentId, leaves);
  }
  return { newSetList, newMap };
};

export { store };
