import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { Utils } from '../../../../scripts/packages/tator-js/pkg/dist/tator.js';

const api = Utils.getApi();
// console.log(api);

export const getCompiledList = ({type, skip = null, check = null}) => {
   // this gets the versions again, sets them
   // but it returns a list usable for settings page (checkbox set)
   let list = [];
   switch (type) {
      case "Version":
         list = store.getState().versions;
         break;
      default:
         console.error(`Invalid type: ${type}`);
   }
   
   // Use values if any, and the list of types to make a compiled list, a checkbox object
   const newList = [];
   
   for (let id of list.setList) {
      const item = store.getState().versions.map.get(id);
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

   return newList;
}

const store = create(subscribeWithSelector((set, get) => ({
   status: { // page status
      name: "idle",
      msg: "" // if Error this could trigger "toast" with message
   },
   project: {},
   versions: {
      init: false,
      setList: new Set(),
      map: new Map(),
      inputHandles: [] // Form change and data can be computed value off inputHandles
   }, 
   mediaTypes: [],
   localizationTypes: [],
   leafTypes: [],
   stateTypes: [],
   memberships: [],
   alogrithms: [],
   applets: [],
   jobClusters: [],

   /* project */
   fetchProject: async (id) => {
      set({ status: {
         name: "pending",
         msg: "Fetching project data..."
      } });
      const object = await api.getProjectWithHttpInfo(id);

      if (object.response.ok) {
         set({ project: object.data });
         set({ status: {
            name: "idle",
            msg: ""
         }  });         
      } else {
         set({ project: {} });
         set({ status: {
            name: "error",
            msg: object.response.message
         }  });
      }

   },
   removeProject: async () => {
     // todo set({ project: await api.getProjectWithHttpInfo(get().project.id) });
   },

   /* job cluster (used in algo form) */
   fetchJobClusters: async () => {
      let object = await api.getJobClusterListWithHttpInfo(get().project.id);
      set({ jobClusters: object.data });
      return object.data;
   },

   /* media types */
   fetchMediaTypes: async () => {
      let object = await api.getMediaTypeListWithHttpInfo(get().project.id);
      set({ mediaTypes: object.data });
      return object.data;
   },

   /* localization types */
   fetchLocalizationTypes: async () => {
      let object = await api.getLocalizationTypeListWithHttpInfo(get().project.id);
      set({ localizationTypes: object.data });
      return object.data;
   },

   /* leaf types */
   fetchLeafTypes: async () => {
      let object = await api.getLeafTypeListWithHttpInfo(get().project.id);
      set({ leafTypes: object.data });
      return object.data;
   },

   /* state types */
   fetchStateTypes: async () => {
      let object = await api.getStateTypeListWithHttpInfo(get().project.id);
      set({ stateTypes: object.data });
      return object.data;
   },

   /* memberships */
   fetchMemberships: async () => {
      let object = await api.getMembershipListWithHttpInfo(get().project.id);
      set({ memberships: object.data });
      return object.data;
   },

   /* versions */
   fetchVersions: async () => {
      const object = await api.getVersionListWithHttpInfo(get().project.id);
      const setList = get().versions.setList;
      const map = get().versions.map;
      for (let item of object.data) {
         setList.add(item.id);
         map.set(item.id, item);
      }
      set({ versions: {...get().versions, setList, map, init: true } });
      return object.data;
   },
   addVersion: async (spec) => {
      set({ status: {...get.status, name: "pending", msg: "Adding version..."} });
      const object = await api.createVersionWithHttpInfo(get().project.id, spec);
      
      const setList = get().versions.setList;
      setList.add(object.data.id);

      const map = get().versions.map;
      map.set(object.data.id, object.data.object);

      set({ versions: { ...get().versions, map, setList } }); // `push` doesn't trigger state update
      set({ status: {...get.status, name: "idle", msg: ""} });
      
      return object;
   },
   updateVersion: async (id, data) => {
      set({ status: {...get.status, name: "pending", msg: "Adding version..."} });
      const object = await api.updateVersionWithHttpInfo(id, data);

      if (object.data.object) {
         const map = get().versions.map;
         map.set(object.data.id, object.data.object);
         console.log("THIS WAS THE OBJ RETURNED");
         console.log(object);
   
         set({ versions: { ...get().versions, map } }); // `push` doesn't trigger state update    
      } else {
         await get().fetchVersions();
      }
      set({ status: {...get.status, name: "idle", msg: ""} });
      return object;
   },
   getVersionContentCount: async (versionId) => {
      // Return some information for the confirmation
      // TODO add http info and error handling
      // const stateCount = await api.getStateCount(get().project.id, { version: versionId });
      // const localizationCount =  await api.getStateCount(get().project.id, { version: versionId });
      
      return { stateCount: 5, localizationCount: 20};
   },
   removeVersion: async (id) => {
      set({ status: {...get.status, name: "pending", msg: "Removing version..."} });
      const object = await api.deleteVersionWithHttpInfo(id);
      const versionSet = get().versions.setList;
      versionSet.delete(id);
      const versionMap = get().versions.map;
      versionMap.delete(id);

      set({ versions: {...get().versions, map: versionMap, setList: versionSet } });
      set({ status: {...get.status, name: "idle", msg: ""} });      
   },

   /* algorithms */
   fetchAlgorithms: async () => {
      let object = await api.getAlgorithmListWithHttpInfo(get().project.id);
      set({ alogrithms: object.data });
      return object.data;
   },

   /* applets */
   fetchApplets: async () => {
      let object = await api.getAppletListWithHttpInfo(get().project.id);
      set({ applets: object.data });
      return object.data;
   },

   getType: (type) => {
      switch (type) {
         case "MediaType":
            return get().mediaTypes;
         case "LocalizationType":
            return get().localizationTypes;
         case "LeafType":
            return get().leafTypes;;
         case "StateType":
            return get().stateTypes;
         case "Membership":
            return get().memberships;
         case "Version":
            return get().versions;
         case "Algorithm":
            return get().alogrithms;
         case "Applet":
            return get().applets;
         default:
            console.error(`Invalid type: ${type}`);
      }
   },


   /* Generic to allow for loop calls */
   fetchType: (type) => {
      let object = {};

      switch (type) {
         case "MediaType":
            object = get().fetchMediaTypes();
            break;
         case "LocalizationType":
            object = get().fetchLocalizationTypes();
            break;
         case "LeafType":
            object = get().fetchLeafTypes();
            break;
         case "StateType":
            object = get().fetchStateTypes();
            break;
         case "Membership":
            object = get().fetchMemberships();
            break;
         case "Version":
            object = get().fetchVersions();
            break;
         case "Algorithm":
            object = get().fetchAlgorithms();
            break;
         case "Applet":
            object = get().fetchApplets();
            break;
         default:
            console.error(`Invalid type: ${type}`);
      }

      return object;
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
 
 export { store };