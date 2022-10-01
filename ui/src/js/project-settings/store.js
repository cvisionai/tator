import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { Utils } from '../../../../scripts/packages/tator-js/pkg/dist/tator.js';

const api = Utils.getApi();
// console.log(api);

const getMap = new Map();
getMap.set("Project", api.getProjectWithHttpInfo)
   .set("MediaType", api.getMediaTypeListWithHttpInfo)
   .set("LocalizationType", api.getLocalizationTypeListWithHttpInfo)
   .set("LeafType",)
   .set("StateType",)
   .set("Membership",)
   .set("Version", api.getVersionListWithHttpInfo.bind(api))
   .set("Algorithm",)
   .set("Applet",);

const patchMap = new Map();
patchMap.set("Project", api.getProjectWithHttpInfo)
   .set("MediaType", api.getMediaTypeListWithHttpInfo)
   .set("LocalizationType", api.getVersionListWithHttpInfo)
   .set("LeafType",)
   .set("StateType",)
   .set("Membership",)
   .set("Version",)
   .set("Algorithm",)
   .set("Applet",);

const deleteMap = new Map();
deleteMap.set("Project", api.getProjectWithHttpInfo)
   .set("MediaType", api.getMediaTypeListWithHttpInfo)
   .set("LocalizationType", api.getVersionListWithHttpInfo)
   .set("LeafType", )
   .set("StateType", )
   .set("Membership", )
   .set("Version", )
   .set("Algorithm", )
   .set("Applet", )

export const getCompiledList = ({type, skip = null, check = null}) => {
   // this gets the versions again, sets them
   // but it returns a list usable for settings page (checkbox set)
   let list = [];
   switch (type) {
      case "Version":
         list = store.getState().Version;
         break;
      default:
         console.error(`Invalid type: ${type}`);
   }
   
   // Use values if any, and the list of types to make a compiled list, a checkbox object
   const newList = [];
   
   for (let id of list.setList) {
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

   return newList;
}

const store = create(subscribeWithSelector((set, get) => ({
   status: { // page status
      name: "idle",
      msg: "" // if Error this could trigger "toast" with message
   },
   Project: {
      init: false,
      data: {},
   },
   Version: {
      init: false,
      setList: new Set(),
      map: new Map(),
   }, 
   MediaType: {
      init: false,
      setList: new Set(),
      map: new Map(),
   },
   LocalizationType: {
      init: false,
      setList: new Set(),
      map: new Map(),
   },
   LeafType: {
      init: false,
      setList: new Set(),
      map: new Map(),
   },
   StateType: {
      init: false,
      setList: new Set(),
      map: new Map(),
   },
   Membership: {
      init: false,
      setList: new Set(),
      map: new Map(),
   },
   Alogrithm: {
      init: false,
      setList: new Set(),
      map: new Map(),
   },
   Applet: {
      init: false,
      setList: new Set(),
      map: new Map(),
   },
   JobCluster: {
      init: false,
      setList: new Set(),
      map: new Map(),
   },

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

   /* job cluster (used in algo form) */
   fetchJobClusters: async () => {
      let object = await api.getJobClusterListWithHttpInfo(get().Project.data.id);
      set({ JobCluster: object.data });
      return object.data;
   },

   /* media types */
   fetchMediaTypes: async () => {
      let object = await api.getMediaTypeListWithHttpInfo(get().Project.data.id);
      set({ MediaType: object.data });
      return object.data;
   },

   /* localization types */
   fetchLocalizationTypes: async () => {
      let object = await api.getLocalizationTypeListWithHttpInfo(get().Project.data.id);
      set({ LocalizationType: object.data });
      return object.data;
   },

   /* leaf types */
   fetchLeafTypes: async () => {
      let object = await api.getLeafTypeListWithHttpInfo(get().Project.data.id);
      set({ LeafType: object.data });
      return object.data;
   },

   /* state types */
   fetchStateTypes: async () => {
      let object = await api.getStateTypeListWithHttpInfo(get().Project.data.id);
      set({ StateTypes: object.data });
      return object.data;
   },

   /* memberships */
   fetchMemberships: async () => {
      let object = await api.getMembershipListWithHttpInfo(get().Project.data.id);
      set({ memberships: object.data });
      return object.data;
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

   /* algorithms */
   fetchAlgorithms: async () => {
      let object = await api.getAlgorithmListWithHttpInfo(get().Project.data.id);
      set({ alogrithms: object.data });
      return object.data;
   },

   /* applets */
   fetchApplets: async () => {
      let object = await api.getAppletListWithHttpInfo(get().Project.data.id);
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
            return get().Version;
         case "Algorithm":
            return get().alogrithms;
         case "Applet":
            return get().applets;
         default:
            console.error(`Invalid type: ${type}`);
      }
   },


   /* Generic to allow for loop calls */
   initType: (type) => {
      const s = store.getState();
      let init = s[type].init;
      console.log(val);

      // if (!get()[type].init) {
      //    return set().fetchType(type);
      // }
   },
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