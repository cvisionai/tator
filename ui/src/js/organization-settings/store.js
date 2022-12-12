import create from 'zustand/vanilla';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { ApiClient, getApi } from '../../../../scripts/packages/tator-js/pkg/src/index.js';

const api = getApi(window.localStorage.getItem('backend'));
const organizationId = Number(window.location.pathname.split('/')[1]);
console.log(api);

async function configureImageClassification(project) {
   let response = await api.createMediaType(project.id, {
      name: "Images",
      dtype: "image",
      attribute_types: [{
         name: "Label",
         description: "Image classification label.",
         dtype: "string",
         order: 0,
      }],
   });
   console.log(response.message);
}

async function configureObjectDetection(project) {
   let response = await api.createMediaType(project.id, {
      name: "Images",
      dtype: "image",
      attribute_types: [],
   });
   console.log(response.message);
   const imageTypeId = response.id;

   response = await api.createMediaType(project.id, {
      name: "Videos",
      dtype: "video",
      attribute_types: [],
   });
   console.log(response.message);
   const videoTypeId = response.id;

   response = await api.createLocalizationType(project.id, {
      name: "Boxes",
      dtype: "box",
      media_types: [imageTypeId, videoTypeId],
      attribute_types: [{
         name: "Label",
         description: "Object detection label.",
         dtype: "string",
         order: 0,
      }],
   });
   console.log(response.message);
}

async function configureMultiObjectTracking(project) {
   let response = await api.createMediaType(project.id, {
      name: "Videos",
      dtype: "video",
      attribute_types: [],
   });
   console.log(response.message);
   const videoTypeId = response.id;

   response = await api.createStateType(project.id, {
      name: "Tracks",
      association: "Localization",
      interpolation: "none",
      media_types: [videoTypeId],
      attribute_types: [{
         name: "Label",
         description: "Track label.",
         dtype: "string",
         order: 0,
      }],
   });
   console.log(response.message);

   response = await api.createLocalizationType(project.id, {
      name: "Boxes",
      dtype: "box",
      media_types: [videoTypeId],
      attribute_types: [],
   });
}

async function configureActivityRecognition(project) {
   let response = await api.createMediaType(project.id, {
      name: "Videos",
      dtype: "video",
      attribute_types: [],
   });
   console.log(response.message);
   const videoTypeId = response.id;

   response = await api.createStateType(project.id, {
      name: "Activities",
      association: "Frame",
      interpolation: "latest",
      media_types: [videoTypeId],
      attribute_types: [{
         name: "Something in view",
         description: "Whether something is happening in the video.",
         dtype: "bool",
         order: 0,
      }],
   });
   console.log(response.message);
}

const getMap = new Map();
getMap.set("Organization", api.getOrganizationWithHttpInfo.bind(api))
   .set("Affiliation", api.getAffiliationListWithHttpInfo.bind(api))
   .set("Bucket", api.getBucketListWithHttpInfo.bind(api))
   .set("Invitation", api.getInvitationListWithHttpInfo.bind(api))
   .set("JobCluster", api.getJobClusterListWithHttpInfo.bind(api))
   .set("Membership", api.getMembershipListWithHttpInfo.bind(api))
   .set("Project", api.getProjectListWithHttpInfo.bind(api));

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
   currentUser: {
      data: {},
      membershipsByProject: new Map()
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
      map: new Map(),
      userMap: new Map(),
      emailMap: new Map(),
      usernameToUserMap: new Map()
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
   Project: {
      name: "Project",
      init: false,
      setList: new Set(),
      map: new Map(),
      versionMap: new Map()
   },
   Membership: {
      name: "Membership",
      init: false,
      setList: new Set(),
      map: new Map(),
      usernameMebershipsMap: new Map(),
      projectIdMembersMap: new Map()
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
   getCurrentUser: async () => {
      const user = await api.whoami();
      set({ currentUser: { ...get().currentUser, data: user} });
      if (!get()["Membership"].init) await get().fetchMemberships();
   },


   /**
    * 
    */
   getData: async (type, id) => {
      if (!get()[type].init) await get().fetchTypeByOrg(type);
      const info = get()[type];
      return info.map.get(Number(id));
   },

   getMembershipData: async (username) => {
      if (!get()["Membership"].init) await get().fetchMemberships();
      const info = get()["Membership"];
      console.log(info);
      return info.usernameMebershipsMap.get(username); // returns membershipIds
   },

   getProjMembershipData: async (projectId) => {
      await get().fetchMemberships();
      const info = get()["Membership"];
      console.log(info);
      return info.projectIdMembersMap.get(projectId);   
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
         data = await get().fetchTypeByOrg(type);
      } else {
         data = await get()[type];
      }

      return data;
   },

   /**
    * 
    * @param {*} projectId 
    * @returns 
    */
   getVersions: async (projectId) => {
      const type = "Version";
      console.log("DEBUG: fetchTypeByProject " + type);
      set({ status: { ...get().status, name: "bg-fetch", msg: `Adding ${type}...` } });
      try {
         if (get().Project.versionMap.has(projectId)) {
            return get().Project.versionMap.get(projectId);
         } else {
            console.log("Get with projectId " + projectId);
            const object = await api.getVersionListWithHttpInfo(projectId);

            if (object.response.ok) {
               const map = get().Project.versionMap;
               map.set(projectId, object.data);
               set({ Project: { ...get().Project, versionMap: map } });
               return object.data;
            } else {
               console.error("Object response not ok for fetchType", object);
               return [];
            }
         }
         
      } catch (err) {
         // Error: Return status to idle (handles page spinner)
         console.error("Fetch type by org hit an issue.", err);
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },

   fetchTypeByOrg: async (type) => {
      console.log("DEBUG: fetchTypeByOrg " + type);
      set({ status: { ...get().status, name: "bg-fetch", msg: `Adding ${type}...` } });
      try {
         const fn = getMap.get(type);
         let orgId = organizationId;

         const object = (type == "Project") ? await fn({ organization: orgId }) : await fn(orgId);
         // console.log(`DEBUG: fetchTypeByOrg ${type} response....`, object);

         if (object.response.ok) {
            const setList = new Set();
            const map = new Map();
            const userMap = new Map();
            const emailMap = new Map();

            /* Add the data via loop to: setList and map */
            let loopData = (type === "Organization") ? [object.data] : object.data;
            for (let item of loopData) {
               setList.add(item.id);
               map.set(item.id, item);

               if (type == "Affiliation") {
                  // to tie to for project membership info
                  userMap.set(item.username, item);

                  // to tie to invitations
                  emailMap.set(item.email, item)
               }

            }

            // Init related types
            if (type == "Project") {
               get().fetchMemberships(map);
            } else if (type == "Invitation") {
               get().initType("Affiliation");
            } else if ("Affiliation") {
               get().initType("Project");
            }

            if (type == "Organization") {
               set({ [type]: { ...get()[type], setList, map, data: object.data, init: true } });
            } else if (type == "Affiliation") {
               set({ [type]: { ...get()[type], setList, map, userMap, emailMap, init: true } });
            } else {
               set({ [type]: { ...get()[type], setList, map, init: true } });
            }

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

   fetchMemberships: async (projectList = null) => {
      // if (projectList == null) {
         await get().initType("Project");
         projectList = get().Project.map;
         console.log(projectList);
      // }
      if (!projectList) return;
      set({ status: { ...get().status, name: "bg-fetch", msg: `Adding Memberships...` } });
      const fn = getMap.get("Membership");
      const map = new Map();
      const setList = new Set();
      for (let [projectId, project] of projectList) {
         try {
            // const projectId = project.id;
            const object = await fn(projectId);
            const currentUserId = get().currentUser.data.id;
            const currenUserMap = new Map();

            // Get memberships for each project, and loop the data
            if (object.response.ok) {
               const usernameMebershipsMap = new Map();
               const projectIdMembersMap = new Map();

               //console.log(`Membership data projectId ${projectId} `, object.data)
               
               // To accomplish: get me memberships for project ID X
               const memberList = object.data;
               projectIdMembersMap.set(projectId, memberList);

               /* Add the data via loop to: setList and map */
               for (let item of memberList) {
                  const membershipId = item.id;
                  setList.add(membershipId);

                  // To accomplish: get me membership ID X
                  map.set(membershipId, item);

                  // To accomplish: Does my affiliate's username appear in my project memberships?
                  // Accumulate a list to associate a username, and membershipId
                  // I do not want to store the membership object twice just the references to it
                  // If I need the project info it is in the memberships object attr "project"
                  const username = item.username;
                  let userList = get().Membership.usernameMebershipsMap.has(username) ? get().Membership.usernameMebershipsMap.get(username) : [];
                  userList.push(membershipId);
                  userList = [...new Set(userList)];
                  usernameMebershipsMap.set(item.username, userList);

                  //
                  if (item.user === currentUserId) {
                     currenUserMap.set(projectId, item);
                  }
               }

               set({ Membership : { ...get().Membership, map, setList, usernameMebershipsMap, projectIdMembersMap, init: true } });
               set({ currentUser: { ...get().currentUser, membershipsByProject: currenUserMap } });

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
      }
   },

   getUser: async (username) => {
      if (get().Affiliation.usernameToUserMap.has(username)) {
         return get().Affiliation.usernameToUserMap.get(username);
      } else {
         try {
            const usernameToUserMap = new Map();
            const responseInfo = await api.getUserListWithHttpInfo({username});
            const userData = responseInfo.data[0];
            usernameToUserMap.set(username, userData);
            set({ Affiliation: {...get().Affiliation, usernameToUserMap} });
            return userData;
         } catch (err) {
            console.error(err);
         }

      } 

   },

   addType: async ({ type, data }) => {
      set({ status: { ...get().status, name: "pending", msg: `Adding ${type}...` } });
      try {
         const fn = postMap.get(type);
         const organizationId = get().organizationId;
         const responseInfo = await fn(organizationId, data);

         // Refresh the page data before setting the selection
         await get().fetchTypeByOrg(type);

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
         await get().fetchTypeByOrg(type);

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

         await get().fetchTypeByOrg(type);

         return object;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   resetInvitation: async (inviteSpec) => {
      console.log("resetInvitation", inviteSpec);
      set({ status: { ...get().status, name: "pending", msg: "Reseting invitation..." } });
      try {
         const type = "Invitation";
         const fn = deleteMap.get(type);
         const object = await fn(inviteSpec.id);
         console.log("Result deleting" + inviteSpec.id, object)

         const createFn = postMap.get(type);
         const objectCreate = await createFn(get().organizationId, {
            email: inviteSpec.email,
            permission: inviteSpec.permission
         });
         console.log("Result adding a new with the same spec", objectCreate)

         get().setSelection({
            typeName: "Invitation",
            typeId: objectCreate.data.id,
            inner: false
         });

         await get().fetchTypeByOrg(type);

         return objectCreate;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   getProjectByUsername: async (username) => {
      const info = await get().initType("Project");
      console.log("Project info....", info);
      const userProjects = info.userMap.has(username) ? info.userMap.has(username) : [];
      return userProjects;
   },
   addMembership: async ({ projectId, formData }) => {
      console.log("addMembership to projectId "+projectId);
      set({ status: { ...get().status, name: "pending", msg: "Adding membership..." } });
      try {
         const info = await api.createMembershipWithHttpInfo(projectId, formData);
         
         await get().fetchTypeByOrg("Project");
         await get().fetchTypeByOrg("Affiliation");
         console.log("Returning ", info);
         return info;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   updateMembership: async ({ membershipId, formData }) => {
      console.log("updateMembership, membershipId: "+membershipId);
      set({ status: { ...get().status, name: "pending", msg: "Updating membership..." } });
      try {
         const info = await api.updateMembershipWithHttpInfo(membershipId, formData);
         
         await get().fetchTypeByOrg("Project");
         await get().fetchTypeByOrg("Affiliation");
         console.log("Returning ", info);
         return info;
      } catch (err) {
         set({ status: { ...get().status, name: "idle", msg: "" } });
         return err;
      }
   },
   addProject: async (projectSpec, preset) => {
      console.log({
         ...projectSpec,
         organization: get().organizationId,
         
      });
      let info = await api.createProjectWithHttpInfo({
         ...projectSpec,
         organization: get().organizationId
        
      });

      if (info.response.ok) {
         const project = info.data.object;
      
         switch (preset) {
            case "imageClassification":
               await configureImageClassification(project);
               break;
            case "objectDetection":
               await configureObjectDetection(project);
               break;
            case "multiObjectTracking":
               await configureMultiObjectTracking(project);
               break;
            case "activityRecognition":
               await configureActivityRecognition(project);
               break;
            case "none":
               break;
            default:
               console.error(`Invalid preset: ${preset}`);
         }
   
         //refreshes view
         get().fetchTypeByOrg("Project");
      }
         
      return info;

   },
})));




const loopList = ({ list, skip, check, type}) => {
   let newList = [{
      value: -1,
      label: "Select"
   }];
   console.log(list);
   for (let item of list) {
      const id = item.id;
      if (typeof item !== "undefined" && id !== skip) {
         newList.push({
            id: id,
            value: item.id,
            name: item.name,
            label: item.name,
            checked: (check === id || (Array.isArray(check) && check.includes(id))),
            selected: (check === id || (Array.isArray(check) && check.includes(id)))
         });
      }
   }

   return newList;
}

const loopMap = ({ map, skip, check, type}) => {
   let newList = [{
      value: -1,
      label: "Select"
   }];
   console.log(map);
   for (let [id, item] of map) {
      if (typeof item !== "undefined" && id !== skip) {
         newList.push({
            id: id,
            value: item.id,
            name: item.name,
            label: item.name,
            checked: (check === id || (Array.isArray(check) && check.includes(id))),
            selected: (check === id || (Array.isArray(check) && check.includes(id)))
         });
      }
   }

   return newList;
}

/**
 * Returns a list usable for settings page's checkbox set
 * @param {Object} args 
 * @returns 
 */
 export const getCompiledList = async ({ type, skip = null, check = null }) => {
   await store.getState().initType(type);
   const state = await store.getState()[type];
   let newList = [];

    if (state) {
      const map = state.map;
      console.log(map);
      newList = loopMap({map, skip, check, type});
   }

   return newList;
 }



 /**
 * Returns a list usable version for settings page's enum
 * @param {Object} args 
 * @returns 
 */
export const getCompiledVersionList = async ({ projectId, skip = null, check = null }) => {
   await store.getState().initType("Project");
   console.log(projectId);
   const versions = await store.getState().getVersions(projectId);
   let newList = [];

   if (versions && versions.length) {
      newList = loopList({list: versions, skip, check, type:"Version"});
   }

   return newList;
}


export { store };
