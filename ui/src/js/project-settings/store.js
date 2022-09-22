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
   return list.map(item => {
      if (skip !== null && skip == item.id) return;
      return {
         id: item.id,
         name: item.name,
         checked: (check !== null && (check === item.id || check.includes(item.id)) )
      }
   });
}

const store = create(subscribeWithSelector((set, get) => ({
   projectId: null,
   orgId: null,
   project: {},
   versions: [],
   mediaTypes: [],
   localizationTypes: [],
   leafTypes: [],
   stateTypes: [],
   memberships: [],
   alogrithms: [],
   applets: [],

   /* project */
   fetchProject: async () => {
      const object = await api.getProjectWithHttpInfo(get().projectId);
      set({ project: object.data });
      return object.data;
   },
   removeProject: async () => {
     // todo set({ project: await api.getProjectWithHttpInfo(get().projectId) });
   },

   /* media types */
   fetchMediaTypes: async () => {
      let object = await api.getMediaTypeListWithHttpInfo(get().projectId);
      set({ mediaTypes: object.data });
      return object.data;
   },

   /* localization types */
   fetchLocalizationTypes: async () => {
      let object = await api.getLocalizationTypeListWithHttpInfo(get().projectId);
      set({ localizationTypes: object.data });
      return object.data;
   },

   /* leaf types */
   fetchLeafTypes: async () => {
      let object = await api.getLeafTypeListWithHttpInfo(get().projectId);
      set({ leafTypes: object.data });
      return object.data;
   },

   /* state types */
   fetchStateTypes: async () => {
      let object = await api.getStateTypeListWithHttpInfo(get().projectId);
      set({ stateTypes: object.data });
      return object.data;
   },

   /* memberships */
   fetchMemberships: async () => {
      let object = await api.getMembershipListWithHttpInfo(get().projectId);
      set({ memberships: object.data });
      return object.data;
   },

   /* versions */
   fetchVersions: async () => {
      let object = await await api.getVersionListWithHttpInfo(get().projectId);
      set({ versions: object.data });
      return object.data;
   },
   addVersion: async (spec) => {
      let object = await api.createVersionWithHttpInfo(spec);
      const version = object.data.object;
      set({ versions: [...get().versions, version] }); // `push` doesn't trigger state update
      return object.data.object;
   },
   updateVersion: async (id, data) => {
      const object = await api.updateVersionWithHttpInfo(id, data);
      const newVersion = object.data.object;
      const tmpVersions = get().versions; //.filter(version => versionId != id)
      set({ versions: [...tmpVersions, newVersion] });

      // TODO
      // test spread operation or if I need to filter out first
      console.log('test spread operation or if I need to filter out first... id='+id);
      console.log(get().versions);

      return object.data.object;
   },
   getVersionContentCount: async (versionId) => {
      // Return some information for the confirmation
      // TODO add http info and error handling
      const stateCount = await api.getStateCount(get().projectId, { version: versionId });
      const localizationCount =  await api.getStateCount(get().projectId, { version: versionId });
      
      return { stateCount, localizationCount};
   },
   removeVersion: async (versionId) => {
      const object = await api.deleteVersionWithHttpInfo(id);
      if (object.response.ok) {
         set({ versions: get().versions.filter(version => versionId != version.id) });
         return true;
      } else {
         console.error("Error deleting version.", object.response);
         return false;
      }
   },

   /* algorithms */
   fetchAlgorithms: async () => {
      let object = await api.getAlgorithmListWithHttpInfo(get().projectId);
      set({ alogrithms: object.data });
      return object.data;
   },

   /* applets */
   fetchApplets: async () => {
      let object = await api.getAppletListWithHttpInfo(get().projectId);
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
   addType: (type, data) => {
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
   updateType: ({type, id, data}) => {
      let object = {};

      switch (type) {
         case "Version":
            object = get().updateVersion(id, data);
            break;
         default:
            console.error(`Invalid type: ${type}`);
      }

      return object;   
   }
 })));
 
 export { store };