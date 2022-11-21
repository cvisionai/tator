import create from 'zustand/vanilla';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { getApi } from '../../../../scripts/packages/tator-js/pkg/src/index.js';

const api = getApi(window.localStorage.getItem('backend'));
const organizationId = Number(window.location.pathname.split('/')[1]);

const getMap = new Map();
getMap.set("Organization", api.getOrganizationWithHttpInfo.bind(api))
   .set("Affiliation", api.getAffiliationListWithHttpInfo.bind(api))
   .set("Bucket", api.getBucketListWithHttpInfo.bind(api))
   .set("Invitation", api.getInvitationListWithHttpInfo.bind(api))
   .set("JobCluster", api.getJobClusterListWithHttpInfo.bind(api));

const postMap = new Map();
postMap
   .set("Organization", api.createOrganizationWithHttpInfo.bind(api))
   .set("Affiliation", api.createAffiliationWithHttpInfo.bind(api))
   .set("Bucket", api.createBucketWithHttpInfo.bind(api))
   .set("Invitation", api.createInvitationWithHttpInfo.bind(api))
   .set("JobCluster", api.createJobClusterWithHttpInfo.bind(api));

const patchMap = new Map();
patchMap.set("Organization", api.updateOrganizationWithHttpInfo.bind(api))
   .set("Affiliation", api.updateAffiliationWithHttpInfo.bind(api))
   .set("Bucket", api.updateBucketWithHttpInfo.bind(api))
   .set("Invitation", api.updateInvitationWithHttpInfo.bind(api))
   .set("JobCluster", api.updateJobClusterWithHttpInfo.bind(api));

const deleteMap = new Map();
deleteMap.set("Organization", api.deleteOrganizationWithHttpInfo.bind(api))
   .set("Affiliation", api.deleteAffiliationWithHttpInfo.bind(api))
   .set("Bucket", api.deleteBucketWithHttpInfo.bind(api))
   .set("Invitation", api.deleteInvitationWithHttpInfo.bind(api))
   .set("JobCluster", api.deleteJobClusterWithHttpInfo.bind(api));

/**
 * 
*/
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
   organizationId: null,
   emailEnabled: false,
   Organization: {
      name: "Organization",
      data: {},
      init: false,
      setList: new Set(),
      map: new Map()
   },
   Affiliation: {
      name: "Affiliation",
      init: false,
      setList: new Set(),
      map: new Map()
   },
   Bucket: {
      name: "Bucket",
      init: false,
      setList: new Set(),
      map: new Map()
   },
   Invitation: {
      name: "Invitation",
      init: false,
      setList: new Set(),
      map: new Map()
   },
   JobCluster: {
      name: "JobCluster",
      init: false,
      setList: new Set(),
      map: new Map()
   },
   deletePermission: false,
   isStaff: false,
   init: async () => {
    Promise.all([
      api.whoami(),
      api.getAnnouncementList(),
      api.getOrganization(organizationId),
    ])
    .then((values) => {
      set({
        user: values[0],
        announcements: values[1],
        organizationId: values[2].id,
      });
       
       const data = values[2];
       const setList = new Set();
       const mapList = new Map();
       setList.add(values[2].id);
       mapList.set(values[2].id, values[2]);

       set({ Organization: { ...get().Organization, init: true, data, setList, map: mapList } }); 
    });
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
      api.whoami(),
      api.getAnnouncementList(),
    ])
    .then((values) => {
      set({
        user: values[0],
        announcements: values[1],
      });
    });
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

   /* project */
   setOrganizationData: async (id) => {
      set({
         status: {
            name: "pending",
            msg: "Fetching project data..."
         }
      });

      const object = await api.getOrganizationWithHttpInfo(id);
      const setList = get()["Organization"].setList;
      const map = get()["Organization"].map;

      setList.add(object.data.id);
      map.set(object.data.id, object.data);

      set({ organizationId: object.data.id });
      set({ Organization: { ...get().Organization, init: true, setList, map, data: object.data } });
      
      set({
         status: {
            name: "idle",
            msg: ""
         }
      });

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
      set({ status: { ...get().status, name: "bg-fetch", msg: `Adding ${type}...` } });
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
      set({ status: { ...get().status, name: "bg-fetch", msg: `Adding ${type}...` } });
      try {
         const fn = getMap.get(type);
         const projectId = get().projectId;
         const object = await fn(projectId);

         if (object.response.ok) {
            const setList = new Set();
            const map = new Map();
   
            /* Add the data via loop to: setList and map */
            if (type == "Organization") {
               setList.add(object.data.id);
               map.set(object.data.id, object.data);
   
               /* Organization set like this to include a "data" attr */
               set({ Organization: { ...get().Organization, init: true, setList, map, data: object.data } });
            } else {
               for (let item of object.data) {
                  setList.add(item.id);
                  map.set(item.id, item);
               }
               set({ [type]: { ...get()[type], setList, map, init: true } });
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
      set({ status: { ...get().status, name: "pending", msg: `Adding ${type}...` } });
      try {
         const fn = postMap.get(type);
         const projectId = get().projectId;
         const responseInfo = await fn(projectId, data); 

         // Refresh the page data before setting the selection
         await get().fetchType(type);

         // Select the new type 
         //Response should have the newly added ID
         let newID = (responseInfo.data.id) ? responseInfo.data.id : "New";
         window.location = `${window.location.origin}${window.location.pathname}#${type}-${newID}`;
         

         set({ status: { ...get().status, name: "idle", msg: "" } });

         // This includes the reponse so error handling can happen in ui
         return responseInfo;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   updateType: async ({ type, id, data }) => {
      set({ status: { ...get().status, name: "pending", msg: "Updating version..." } });
      try {
         const fn = patchMap.get(type);
         const responseInfo = await fn(id, data);

         // Assume object isn't returned, refetch type
         await get().fetchType(type);

         set({ status: { ...get().status, name: "idle", msg: "" } });
         return responseInfo;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   removeType: async ({ type, id }) => {
      set({ status: { ...get().status, name: "pending", msg: "Updating version..." } });
      try {
         const fn = deleteMap.get(type);
         const object = await fn(id);

         await get().fetchType(type);

         return object;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },

})));


export { store };
