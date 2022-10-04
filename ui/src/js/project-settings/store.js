import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { Utils } from '../../../../scripts/packages/tator-js/pkg/dist/tator.js';

const api = Utils.getApi();
// console.log(api);

const getMap = new Map();
getMap.set("Project", api.getProjectWithHttpInfo.bind(api))
   .set("MediaType", api.getMediaTypeListWithHttpInfo.bind(api))
   .set("LocalizationType", api.getLocalizationTypeListWithHttpInfo.bind(api))
   .set("LeafType", api.getLeafTypeListWithHttpInfo.bind(api))
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
   .set("StateType", api.createStateTypeWithHttpInfo.bind(api))
   .set("Membership", api.createMembershipWithHttpInfo.bind(api))
   .set("Version", api.createVersionWithHttpInfo.bind(api));
   // .set("Algorithm", api.createAlgorithmWithHttpInfo.bind(api))
   // .set("Applet", api.createAppletWithHttpInfo.bind(api));

const patchMap = new Map();
patchMap.set("Project", api.updateProjectWithHttpInfo.bind(api))
   .set("MediaType", api.updateMediaTypeWithHttpInfo.bind(api))
   .set("LocalizationType", api.updateLocalizationTypeWithHttpInfo.bind(api))
   .set("LeafType", api.updateLeafTypeWithHttpInfo.bind(api))
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
   .set("StateType", api.deleteStateTypeWithHttpInfo.bind(api))
   .set("Membership", api.deleteMembershipWithHttpInfo.bind(api))
   .set("Version", api.deleteVersionWithHttpInfo.bind(api))
   .set("Algorithm", api.deleteAlgorithmWithHttpInfo.bind(api))
   .set("Applet", api.deleteAppletWithHttpInfo.bind(api));

/** 
 * This is state of all Types below for init
 */
const initialState = {
   name: '',
   init: false,
   setList: new Set(),
   map: new Map(),
};

const store = create(subscribeWithSelector((set, get) => ({
   status: { // page status
      name: "idle",
      msg: "" // if Error this could trigger "toast" with message
   },
   Project: {
      name: "Project",
      init: false,
      data: {},
   },
   MediaType: { ...initialState, name: "MediaType", attribute_types: {} }, 
   LocalizationType: {...initialState, name: "LocalizationType", attribute_types: {} }, 
   LeafType: {...initialState, name: "LeafType", attribute_types: {} }, 
   StateType: {...initialState, name: "StateType", attribute_types: {} }, 
   Membership: { ...initialState, name: "Membership" },
   Version: {...initialState, name: "Version"}, 
   Alogrithm: {...initialState, name: "Alogrithm"}, 
   Applet: {...initialState, name: "Applet"}, 
   JobCluster: {...initialState, name: "JobCluster"}, 

   /* project */
   fetchProject: async (id) => {
      set({ status: {
         name: "pending",
         msg: "Fetching project data..."
      }});
      
      const object = await api.getProjectWithHttpInfo(id);

      set({ Project: { ...get().Project, init: true, data: object.data } });
      set({ status: {
         name: "idle",
         msg: ""
      }  });

   },
   removeProject: async () => {
     // todo set({ project: await api.getProjectWithHttpInfo(get().Project.data.id) });
   },



   /* versions */
   // fetchVersions: async () => {
   //    // const object = await api.getVersionListWithHttpInfo(get().Project.data.id);
   //    const getFn = getMap.get("Version");
   //    const projectId = get().Project.data.id;
      
   //    const object = await getFn(projectId);

   //    console.log("THIS WAS THE OBJ RETURNED");
   //    console.log(object);

   //    const setList = get().Version.setList;
   //    const map = get().Version.map;

   //    for (let item of object.data) {
   //       setList.add(item.id);
   //       map.set(item.id, item);
   //    }

   //    set({ Version: {...get().Version, setList, map, init: true } });
   //    return object.data;
   // },
   addVersion: async (spec) => {
      set({ status: {...get().status, name: "pending", msg: "Adding version..."} });
      const object = await api.createVersionWithHttpInfo(get().Project.data.id, spec);
      
      console.log("THIS WAS THE OBJ RETURNED");
      console.log(object);

      if (object.data &&                               object.data.object) {
         const setList = get().Version.setList;
         setList.add(object.data.id);

         const map = get().Version.map;
         map.set(object.data.id, object.data.object);

         set({ Version: { ...get().Version, map, setList } }); // `push` doesn't trigger state update
      } else {
         await get().fetchVersions();
      }
      
      set({ status: { ...get().status, name: "idle", msg: "" } });
      
      return object;
   },
   updateVersion: async (id, data) => {
      set({ status: {...get().status, name: "pending", msg: "Adding version..."} });
      const object = await api.updateVersionWithHttpInfo(id, data);
      console.log("THIS WAS THE OBJ RETURNED");
      console.log(object);

      if (object.data && object.data.object) {
         const map = get().Version.map;
         map.set(object.data.id, object.data.object);

         set({ Version: { ...get().Version, map } }); // `push` doesn't trigger state update    
      } else {
         await get().fetchVersions();
      }
      set({ status: {...get().status, name: "idle", msg: ""} });
      return object;
   },
   getVersionContentCount: async (versionId) => {
      // Return some information for the confirmation
      // TODO add http info and error handling
      // const stateCount = await api.getStateCount(get().Project.data.id, { version: versionId });
      // const localizationCount =  await api.getStateCount(get().Project.data.id, { version: versionId });
      
      return { stateCount: 5, localizationCount: 20};
   },
   removeVersion: async (id) => {
      set({ status: {...get().status, name: "pending", msg: "Removing version..."} });
      const object = await api.deleteVersionWithHttpInfo(id);
      const versionSet = get().Version.setList;
      versionSet.delete(id);
      const versionMap = get().Version.map;
      versionMap.delete(id);

      set({ Version: {...get().Version, map: versionMap, setList: versionSet } });
      set({ status: { ...get().status, name: "idle", msg: "" } });
      return object;
   },

   /* Generic to allow for loop calls */
   initType: (type) => {
      let init = get()[type].init;
      // console.log(s);
      console.log(`IF ${type} is init? ${init}`);

      if (!init) {
         return get().fetchType(type);
      }
   },
   fetchType: async (type) => {
      // const object = await api.getVersionListWithHttpInfo(get().Project.data.id);
      const fn = getMap.get(type);
      const projectId = get().Project.data.id;   
      const object = await fn(projectId);

      console.log("THIS WAS THE OBJ RETURNED");
      console.log(object);

      const setList = get()[type].setList;
      const map = get()[type].map;

      for (let item of object.data) {
         setList.add(item.id);
         map.set(item.id, item);
      }

      // set({ status: {...get().status, name: "idle", msg: ""} });
      console.log("FETCH TYPE....");
      set({[type] : { ...get()[type], setList, map, init: true }});
   
      return object.data;
   },
   addType:  async ({type, data}) => {
      set({ status: { ...get().status, name: "pending", msg: `Adding ${type}...` } });
      const fn = postMap.get(type, data);
      const projectId = get().Project.data.id;
      const object = await fn(projectId, data);
      
      console.log("THIS WAS THE OBJ RETURNED");
      console.log(object);

      if (object.data && object.data.object) {
         const setList = get()[type].setList;
         setList.add(object.data.id);

         const map = get()[type].map;
         map.set(object.data.id, object.data.object);

         set({ [type] : { ...get()[type], setList, map} }); // `push` doesn't trigger state update
      } else {
         // If object isn't returned, refetch type
         await get().fetchType(type);
      }
      
      set({ status: { ...get().status, name: "idle", msg: "" } });
      
      // This includes the reponse so error handling can happen in ui
      return object;
   },
   updateType: async ({type, id, data}) => {
      set({ status: { ...get().status, name: "pending", msg: "Updating version..." } });
      const fn = patchMap.get(type);
      const object = await fn(id, data);

      console.log("THIS WAS THE OBJ RETURNED");
      console.log(object);

      if (object.data && object.data.object) {
         const map = get()[type].map;
         map.set(object.data.id, object.data.object);

         set({ [type] : { ...get()[type], map} }); // `push` doesn't trigger state update    
      } else {
         // If object isn't returned, refetch type
         await get().fetchType(type);
      }
      set({ status: {...get().status, name: "idle", msg: ""} });
      return object;
   },
   removeType: async ({type, id}) => {
      set({ status: { ...get().status, name: "pending", msg: "Updating version..." } });
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

         set({ [type] : { ...get()[type], map, setList} }); // `push` doesn't trigger state update    
      } else {
         // If object isn't returned, refetch type
         await get().fetchType(type);
      }
      set({ status: {...get().status, name: "idle", msg: ""} });
      return object;
   }
})));


/**
 * Returns a list usable for settings page's checkbox set
 * @param {Object} args 
 * @returns 
 */
export const getCompiledList = ({type, skip = null, check = null}) => {
   const state = store.getState()[type];
   const newList = [];
   
   if (state) {
      for (let id of state.setList) {
         const item = store.getState().Version.map.get(id);
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