import create from 'zustand/vanilla';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { Utils } from '../../../../scripts/packages/tator-js/pkg/dist/tator.js';

const api = Utils.getApi();
// console.log(api);

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
   .set("Applet", api.getAppletListWithHttpInfo.bind(api));

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
      typeId: -1,
      inner: false
   },
   status: { // page status
      name: "idle",
      msg: "" // if Error this could trigger "toast" with message
   },
   other: {
      //
   },
   projectId: null,
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
      leafType: null
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
      console.log("!#&*@(37182937128937128371982379838)::store:: setSelection");
      set({
         selection: {
            ...get().selection,
            ...newSelection
         }
      });
   },

   getData: async (type, id) => {
      console.log(`XXX getData: async (type, id ${id} type ${typeof id}) => {`);
      const info = get()[type];
      console.log("Is it init? " + info.init);
      if (info.init !== true) {
         await get().fetchType(type);
      }
      console.log("Getting data after init check.........");
      if (id !== null && info.map && info.map.get(Number(id))) {
         const typeData = info.map.get(Number(id));
         return typeData;
      }

   },

   /* project */
   setProjectId: async (id) => {
      set({
         status: {
            name: "pending",
            msg: "Fetching project data..."
         }
      });

      const object = await api.getProjectWithHttpInfo(id);
      const setList = get()["Project"].setList;
      const map = get()["Project"].map;

      console.log("FETCHING PROJECT DATA......");
      console.log(object);

      // for (let item of object.data) {
      setList.add(object.data.id);
      map.set(object.data.id, object.data);
      // }

      console.log(map);

      set({ projectId: id });
      // set({ Project: { ...get().Project, init: true, setList, map, data: object.data } });
      set({
         status: {
            name: "idle",
            msg: ""
         }
      });

   },
   removeProject: async () => {
      // todo set({ project: await api.getProjectWithHttpInfo(get().projectId) });
   },

   /* Generic to allow for loop calls */
   initType: async (type) => {
      console.log("Init type: " + type);
      let init = get()[type].init;

      if (!init) {
         await get().fetchType(type);
      }
   },
   fetchType: async (type) => {
      set({ status: { ...get().status, name: "pending", msg: `Adding ${type}...` } });
      try {
         const fn = getMap.get(type);
         const projectId = get().projectId;
         const object = await fn(projectId);
         console.log("FETCH TYPE " + type, object);

         const setList = get()[type].setList;
         const map = get()[type].map;

         if (get()[type].name == "Project") {
            setList.add(object.data.id);
            map.set(object.data.id, object.data);
            set({ Project: { ...get().Project, init: true, setList, map, data: object.data } });
         } else if (get()[type].name == "LeafType") {
            for (let item of object.data) {
               setList.add(item.id);
               map.set(item.id, item);
            }

            // Set up the leaf data so inner links can be added
            const leavesData = await get().fetchType("Leaf");
            console.log(leavesData);
            const leavesMap = new Map();
            for (let group of leavesData) {
               console.log(group);
            }

            set({ [type]: { ...get()[type], setList, map, init: true, leaves: leavesData } });
         } else {
            for (let item of object.data) {
               setList.add(item.id);
               map.set(item.id, item);
            }
            set({ [type]: { ...get()[type], setList, map, init: true } });
         }
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return object.data;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
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
            console.log("Using object to update type......");
            const setList = get()[type].setList;
            setList.add(object.data.id);

            const map = get()[type].map;
            map.set(object.data.id, object.data.object);

            set({ [type]: { ...get()[type], setList, map } }); // `push` doesn't trigger state update
         } else {
            console.log("Refetch type......");
            // If object isn't returned, refetch type
            await get().fetchType(type);
         }

         set({ selection: { ...get().selection, typeName: type, typeId: object.data.id } });
         set({ status: { ...get().status, name: "idle", msg: "" } });

         // This includes the reponse so error handling can happen in ui
         return object;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
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
      }
   },
   removeType: async ({ type, id }) => {
      set({ status: { ...get().status, name: "pending", msg: "Updating version..." } });
      try {
         const fn = deleteMap.get(type);
         console.log(fn);
         const object = await fn(id);

         console.log("THIS WAS THE OBJ RETURNED");
         console.log(object);

         if (object.data && object.data.object) {
            const setList = get()[type].setList;
            setList.delete(id);

            const map = get()[type].map;
            map.delete(id);

            set({ [type]: { ...get()[type], map, setList } }); // `push` doesn't trigger state update    
         } else {
            // If object isn't returned, refetch type
            await get().fetchType(type);
         }
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return object;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
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

export { store };