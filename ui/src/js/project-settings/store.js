import create from '../../../node_modules/zustand/esm/vanilla.mjs';
import { subscribeWithSelector, devtools } from '../../../node_modules/zustand/esm/middleware.js';
import { fetchCredentials } from '../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js';

const listResources = {
  "Project": "Project",
  "MediaType": "MediaTypes",
  "LocalizationType": "LocalizationTypes",
  "LeafType": "LeafTypes",
  "Leaf": "Leaves",
  "StateType": "StateTypes",
  "Membership": "Memberships",
  "Version": "Versions",
  "Algorithm": "Algorithms",
  "HostedTemplate": "HostedTemplates",
  "JobCluster": "JobClusters",
  "Applet": "Applets",
  "User": "Users",
};

const detailResources = {
  "Project": "Project",
  "MediaType": "MediaType",
  "LocalizationType": "LocalizationType",
  "LeafType": "LeafType",
  "Leaf": "Leave",
  "StateType": "StateType",
  "Membership": "Membership",
  "Version": "Version",
  "Algorithm": "Algorithm",
  "Applet": "Applet",
};

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
    organizationList: [],
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
    HostedTemplate: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "HostedTemplate",
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
      const response = await fetchCredentials(`/rest/User/${userId}`, {}, true);
      if (response.ok) {
        return await response.json();
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
        if (get().organizationList) {
          const objects = await get().fetchTypeByOrg("JobCluster");
          const jobClusters = objects.map((obj) => obj.data || []).flat();

          set({
            JobClusterPermission: {
              ...get().JobClusterPermission,
              userCantSee: false,
              userCantSave: !get().isStaff && jobClusters.length == 0,
            },
          });

          // Success: Return status to idle (handles page spinner)
          set({ status: { ...get().status, name: "idle", msg: "" } });
          return objects;
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
      Promise.all([
        fetchCredentials(`/rest/User/GetCurrent`, {}, true)
          .then((response) => response.json()),
        fetchCredentials('/rest/Announcements', {}, true)
          .then((response) => response.json()),
      ]).then((values) => {
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

      const project = await fetchCredentials(`/rest/Project/${id}`, {}, true).then(response => response.json());
      const setList = get()["Project"].setList;
      const map = get()["Project"].map;

      setList.add(project.id);
      map.set(project.id, project);

      set({ projectId: id });
      set({ organizationList: await fetchCredentials(`/rest/Organizations`, {}, true).then(response => response.json())});
      set({
        Project: {
          ...get().Project,
          init: true,
          setList,
          map,
          data: project,
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
        const fn = async (projectId) => {
          const response = await fetchCredentials(`/rest/${listResources[type]}/${projectId}`, {}, true);
          const data = await response.json();
          return { response: response, data: data };
        };
        // Get all organizations this user has access to
        const orgList = get().organizationList;
        const promises = [];
        for (const org of orgList) {
          if (org.permission == "Admin") {
            promises.push(fn(org.id));
          }
        }
        const objects = await Promise.all(promises);
        const setList = new Set();
        const map = new Map();
        for (const object of objects) {
          if (object.response.ok) {
            /* Add the data via loop to: setList and map */
            for (let item of object.data) {
              setList.add(item.id);
              map.set(item.id, item);
            }
          } else {
            console.error("Object response not ok for fetchType", object);
          }
        }
        set({ [type]: { ...get()[type], setList, map, init: true } });

        // Success: Return status to idle (handles page spinner)
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return objects;
      } catch (err) {
        // Error: Return status to idle (handles page spinner)
        console.error("Fetch type by org hit an issue.", err);
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },

    fetchType: async (type) => {
      if (type == "JobCluster" || type == "HostedTemplate")
        return get().fetchTypeByOrg(type);
      set({
        status: { ...get().status, name: "bg-fetch", msg: `Adding ${type}...` },
      });
      try {
        const fn = async (projectId) => {
          const response = await fetchCredentials(`/rest/${listResources[type]}/${projectId}`, {}, true);
          const data = await response.json();
          return { response: response, data: data };
        };
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
      try {
        const fn = async (projectId, body) => {
          const response = await fetchCredentials(`/rest/${listResources[type]}/${projectId}`, {
            method: "POST",
            body: JSON.stringify(body),
          });
          const data = await response.json();
          return { response: response, data: data };
        };
        const projectId = get().projectId;
        const responseInfo = await fn(projectId, data);

        // This includes the reponse so error handling can happen in ui
        return responseInfo;
      } catch (err) {
        set({ status: { ...get().status, name: "idle", msg: "" } });
        return err;
      }
    },
    addTypeSingle: async ({ type, data }) => {
      set({
        status: {
          ...get().status,
          name: "pending",
          msg: `Adding single ${type}...`,
        },
      });

      const responseInfo = await get().addType({ type, data });

      // Select the new type (non-Leaf) forms
      if (type === "Leaf") {
        // Try to reset selection to refresh the same page
        get().setSelection({ typeId: get().selection.typeId });
      } else {
        //Response should have the newly added ID
        let newID = responseInfo.data.id ? responseInfo.data.id : "New";
        window.location = `${window.location.origin}${window.location.pathname}#${type}-${newID}`;
      }

      // Refresh the page data before setting the selection
      await get().fetchType(type);

      set({ status: { ...get().status, name: "idle", msg: "" } });

      return responseInfo;
    },
    addTypeArray: async ({ type, data }) => {
      set({
        status: {
          ...get().status,
          name: "pending",
          msg: `Adding array ${type}...`,
        },
      });

      const responses = [];
      let lastInfo = null;
      for (let d of data) {
        // console.log("Adding data "+type, d);
        const responseInfo = await get().addType({ type, data: d });
        responses.push(responseInfo);
        lastInfo = responseInfo;
      }

      // Refresh the page data before setting the selection
      await get().fetchType(type);

      // Select the new type (non-Leaf) forms
      if (type === "Leaf") {
        // Try to reset selection to refresh the same page
        get().setSelection({ typeId: get().selection.typeId });
      }

      set({ status: { ...get().status, name: "idle", msg: "" } });

      return responses;
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
        const fn = async (id, body) => {
          const response = await fetchCredentials(`/rest/${detailResources[type]}/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
          const data = await response.json();
          return { response: response, data: data };
        };
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
        const fn = async (id) => {
          const response = await fetchCredentials(`/rest/${detailResources[type]}/${id}`, {
            method: "DELETE",
          });
          const data = await response.json();
          return { response: response, data: data };
        };
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
        const state = await fetchCredentials(`/rest/StateCount/${get().projectId}?version={id}`, {}, true)
          .then(response => response.data());
        const loc = await fetchCredentials(`/rest/LocalizationCount/${get().projectId}?version={id}`, {}, true)
          .then(response => response.json());
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
