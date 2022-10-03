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
deleteMap.set("Project", api.deleteVersionWithHttpInfo.bind(api))
   .set("MediaType", api.deleteVersionWithHttpInfo.bind(api))
   .set("LocalizationType", api.deleteVersionWithHttpInfo.bind(api))
   .set("LeafType", api.deleteVersionWithHttpInfo.bind(api))
   .set("StateType", api.deleteVersionWithHttpInfo.bind(api))
   .set("Membership", api.deleteVersionWithHttpInfo.bind(api))
   .set("Version", api.deleteVersionWithHttpInfo.bind(api))
   .set("Algorithm", api.deleteVersionWithHttpInfo.bind(api))
   .set("Applet", api.deleteVersionWithHttpInfo.bind(api));

/** 
 * This is state of all Types below for init
 */
const initialState = {
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
      init: false,
      data: {},
   },
   Version: {...initialState}, 
   MediaType: {...initialState}, 
   LocalizationType: {...initialState}, 
   LeafType: {...initialState}, 
   StateType: {...initialState}, 
   Membership: {...initialState}, 
   Alogrithm: {...initialState}, 
   Applet: {...initialState}, 
   JobCluster: {...initialState}, 

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
   fetchVersions: async () => {
      // const object = await api.getVersionListWithHttpInfo(get().Project.data.id);
      const getFn = getMap.get("Version");
      const projectId = get().Project.data.id;
      
      const object = await getFn(projectId);

      console.log("THIS WAS THE OBJ RETURNED");
      console.log(object);

      const setList = get().Version.setList;
      const map = get().Version.map;

      for (let item of object.data) {
         setList.add(item.id);
         map.set(item.id, item);
      }

      set({ Version: {...get().Version, setList, map, init: true } });
      return object.data;
   },
   addVersion: async (spec) => {
      set({ status: {...get.status, name: "pending", msg: "Adding version..."} });
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
      
      set({ status: { ...get.status, name: "idle", msg: "" } });
      
      return object;
   },
   updateVersion: async (id, data) => {
      set({ status: {...get.status, name: "pending", msg: "Adding version..."} });
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
      set({ status: {...get.status, name: "idle", msg: ""} });
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
      set({ status: {...get.status, name: "pending", msg: "Removing version..."} });
      const object = await api.deleteVersionWithHttpInfo(id);
      const versionSet = get().Version.setList;
      versionSet.delete(id);
      const versionMap = get().Version.map;
      versionMap.delete(id);

      set({ Version: {...get().Version, map: versionMap, setList: versionSet } });
      set({ status: { ...get.status, name: "idle", msg: "" } });
      return object;
   },

   /* Generic to allow for loop calls */
   initType: (type) => {
      const s = store.getState();
      let init = s[type].init;
      // console.log(s);
      console.log(type);

      if (!init) {
         return get().fetchType(type);
      }
   },
   fetchType: async (type) => {
      // const object = await api.getVersionListWithHttpInfo(get().Project.data.id);
      const getFn = getMap.get(type);
      const projectId = get().Project.data.id;   
      const object = await getFn(projectId);

      console.log("THIS WAS THE OBJ RETURNED");
      console.log(object);

      const setList = get()[type].setList;
      const map = get()[type].map;

      for (let item of object.data) {
         setList.add(item.id);
         map.set(item.id, item);
      }

      // set({ status: {...get.status, name: "idle", msg: ""} });
      set({[type] : { ...get[type], setList, map, init: true }});
   
      return object.data;
   },
   addType:  ({type, data}) => {
      let object = {};

      switch (type) {
         case "Version":
            object = get().addVersion(data);
            break;
         default:
            console.error(`Invalid type: ${type}`);
      }

      return object;
   },
   updateType:  ({type, id, data}) => {
      let object = {};

      switch (type) {
         case "Version":
            object =  get().updateVersion(id, data);
            
            break;
         default:
            console.error(`Invalid type: ${type}`);
      }

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