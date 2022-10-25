import create from 'zustand/vanilla';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { Utils } from '../../../../scripts/packages/tator-js/pkg/dist/tator.js';

const api = Utils.getApi();

const getMap = new Map();
getMap.set("Project", api.getProjectWithHttpInfo.bind(api))
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
patchMap.set("Project", api.updateProjectWithHttpInfo.bind(api))
   .set("MediaType", api.updateMediaTypeWithHttpInfo.bind(api))
   .set("LocalizationType", api.updateLocalizationTypeWithHttpInfo.bind(api))
   .set("LeafType", api.updateLeafTypeWithHttpInfo.bind(api))
   .set("Leaf", api.updateLeafListWithHttpInfo.bind(api))
   .set("StateType", api.updateStateTypeWithHttpInfo.bind(api))
   .set("Membership", api.updateMembershipWithHttpInfo.bind(api))
   .set("Version", api.updateVersionWithHttpInfo.bind(api))
   .set("Algorithm", api.updateAlgorithmWithHttpInfo.bind(api))
   .set("Applet", api.updateAppletWithHttpInfo.bind(api));

const deleteMap = new Map();
deleteMap.set("Project", api.deleteProjectWithHttpInfo.bind(api))
   .set("MediaType", api.deleteMediaTypeWithHttpInfo.bind(api))
   .set("LocalizationType", api.deleteLocalizationTypeWithHttpInfo.bind(api))
   .set("LeafType", api.deleteLeafTypeWithHttpInfo.bind(api))
   .set("Leaf", api.deleteLeafListWithHttpInfo.bind(api))
   .set("StateType", api.deleteStateTypeWithHttpInfo.bind(api))
   .set("Membership", api.deleteMembershipWithHttpInfo.bind(api))
   .set("Version", api.deleteVersionWithHttpInfo.bind(api))
   .set("Algorithm", api.deleteAlgorithmWithHttpInfo.bind(api))
   .set("Applet", api.deleteAppletWithHttpInfo.bind(api));

const store = create(subscribeWithSelector((set, get) => ({
   selection: {
      typeName: "",
      typeId: -1
   },
   status: { // page status
      name: "idle",
      msg: "" // if Error this could trigger "toast" with message
   },
   other: {
      //
   },
   projectId: null,
   organizationId: null,
   deletePermission: false,
   isStaff: false,

   Project: {
      name: "Project",
      data: {},
      init: false,
      setList: new Set(),
      map: new Map()
   },
   MediaType: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "MediaType", attribute_types: {}
   },
   LocalizationType: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "LocalizationType", attribute_types: {}
   },
   Leaf: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Leaf",
      mapMeta: new Map()
   },
   LeafType: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "LeafType", attribute_types: {},
      leavesMap: new Map()
   },
   StateType: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "StateType",
      attribute_types: {}
   },
   Membership: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Membership",
      users: {}
   },
   Version: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Version"
   },
   Algorithm: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Algorithm",
      jobClusters: [],
      clusterPermission: null
   },
   Applet: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "Applet"
   },
   JobCluster: {
      init: false,
      setList: new Set(),
      map: new Map(),
      name: "JobCluster"
   },


   /* */
   setSelection: (newSelection) => {
      set({
         selection: {
            ...get().selection,
            ...newSelection
         }
      });
   },

   getData: async (type, id) => {
      const info = get()[type];

      if (info.init !== true) {
         await get().fetchType(type);
      }
      console.log("GET DATA... map:", info.map);
      return info.map.get(Number(id));
   },

   /* project */
   setProjectData: async (id) => {
      set({
         status: {
            name: "pending",
            msg: "Fetching project data..."
         }
      });

      const object = await api.getProjectWithHttpInfo(id);
      const setList = get()["Project"].setList;
      const map = get()["Project"].map;

      setList.add(object.data.id);
      map.set(object.data.id, object.data);

      set({ projectId: id });
      set({ organizationId: object.data.organization });
      set({ Project: { ...get().Project, init: true, setList, map, data: object.data } });
      
      set({
         status: {
            name: "idle",
            msg: ""
         }
      });

   },

   /* Generic to allow for loop calls */
   initType: async (type) => {
      console.log("Init type: " + type);
      let init = get()[type].init;

      if (!init) {
         await get().fetchType(type);
      }

      return get()[type];
   },

   fetchType: async (type) => {
      set({ status: { ...get().status, name: "pending", msg: `Adding ${type}...` } });
      try {
         const fn = getMap.get(type);
         const projectId = get().projectId;
         const object = await fn(projectId);
         const setList = get()[type].setList;
         const map = get()[type].map;

         /* Add the data via loop to: setList and map */
         if (type == "Project") {
            setList.add(object.data.id);
            map.set(object.data.id, object.data);

            /* Project set like this to include a "data" attr */
            set({ Project: { ...get().Project, init: true, setList, map, data: object.data } });
         } else if (type == "Leaf") {
            const leafTypes = await get().initType("LeafType");
            const metaMap = getLeavesByParent({leafTypes,object, currentMap: map});
            set({ [type]: { ...get()[type], setList, map: metaMap, init: true } });
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
      } catch (err) {
         // Error: Return status to idle (handles page spinner)
         console.error("Fetch type hit an issue.", err);
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   addType: async ({ type, data }) => {
      set({ status: { ...get().status, name: "pending", msg: `Adding ${type}...` } });
      try {
         console.log("Adding new type....");
         const fn = postMap.get(type, data);
         const projectId = get().projectId;
         const object = await fn(projectId, data);

         if (object.data && object.data.object) {
            const setList = get()[type].setList;
            setList.add(object.data.id);

            const map = get()[type].map;
            map.set(object.data.id, object.data.object);

            set({ [type]: { ...get()[type], setList, map } }); // `push` doesn't trigger state update
         } else {
            // If object isn't returned, refetch type
            await get().fetchType(type);
         }

         // Select the new type (non-Leaf) forms
         if(type !== "Leaf") set({ selection: { ...get().selection, typeName: type, typeId: object.data.id } });
         set({ status: { ...get().status, name: "idle", msg: "" } });

         // This includes the reponse so error handling can happen in ui
         return object;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   updateType: async ({ type, id, data }) => {
      set({ status: { ...get().status, name: "pending", msg: "Updating version..." } });
      try {
         const fn = patchMap.get(type);
         const object = await fn(id, data);

         if (object.data && object.data.object) {
            const map = get()[type].map;
            map.set(object.data.id, object.data.object);

            set({ [type]: { ...get()[type], map } }); // `push` doesn't trigger state update    
         } else {
            // If object isn't returned, refetch type
            await get().fetchType(type);
         }
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return object;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   removeType: async ({ type, id }) => {
      set({ status: { ...get().status, name: "pending", msg: "Updating version..." } });
      try {
         const fn = deleteMap.get(type);
         console.log(fn);
         const object = await fn(id);

         const setList = get()[type].setList;
         setList.delete(id);

         const map = get()[type].map;
         map.delete(id);

         set({ [type]: { ...get()[type], map, setList } }); // `push` doesn't trigger state update    
         set({ status: { ...get().status, name: "idle", msg: "" } });

         return object;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }

   },

   getCountsRelatedToVersion: async (id) => {
      try {
         const state = await api.getStateCount(get().projectId, { version: id });
         const loc = await api.getLocalizationCount(get().projectId, { version: id });

         return { state, loc };

      } catch (err) {
         return null;
      }
     
   }
})));


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
               checked: (check === item.id || (Array.isArray(check) && check.includes(item.id))),
               selected: (check === item.id || (Array.isArray(check) && check.includes(item.id)))
            });
         }
      }
   }

   return newList;
}

/**
 * Returns a list usable for attribute clone selection sets
 * @returns 
 */
 export const getAttributeDataByType = async () => {
   const attributeDataByType = {
      MediaType: {},
      LocalizationType: {},
      LeafType: {},
      StateType: {}
   };

   for (let type of Object.keys(attributeDataByType)) {
      const data = await store.getState().initType(type);
      for (let [key, entity] of data.map.entries()) {
         attributeDataByType[type][entity.name] = entity.attribute_types;
      }
   }

   return attributeDataByType;
}

export const getLeavesByParent = ({ leafTypes, object, currentMap }) => {
   const newMap = new Map();
   const leaves = object.data;

   for (let item of leaves) {
      const parentId = item.meta;
      item.parent = leafTypes.map.get(parentId);
      const leaves = newMap.has(parentId) ? newMap.get(parentId) : [];
      leaves.push(item);
      newMap.set(parentId, leaves);
   }

   return newMap;
}

export { store };