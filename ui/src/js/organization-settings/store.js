import create from '../../../node_modules/zustand/esm/vanilla.mjs';
import { subscribeWithSelector, devtools } from '../../../node_modules/zustand/esm/middleware.js';
import { fetchCredentials } from '../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js';
import { fetchWithHttpInfo } from '../project-settings/store.js';
import {
  configureImageClassification,
  configureObjectDetection,
  configureMultiObjectTracking,
  configureActivityRecognition,
} from '../projects/store.js';

const organizationId = Number(window.location.pathname.split("/")[1]);

const listResources = {
  "Organization": "Organization",
  "Affiliation": "Affiliations",
  "Bucket": "Buckets",
  "Invitation": "Invitations",
  "JobCluster": "JobClusters",
  "HostedTemplate": "HostedTemplates",
  "Membership": "Memberships",
  "Project": "Projects",
};

const detailResources = {
  "Organization": "Organization",
  "Affiliation": "Affiliation",
  "Bucket": "Bucket",
  "Invitation": "Invitation",
  "JobCluster": "JobCluster",
  "HostedTemplate": "HostedTemplate",
  "Project": "Project",
};

/**
 *
 */
const store = create(
  subscribeWithSelector(
    (set, get) => ({
      selection: {
        typeName: "",
        typeId: -1,
        inner: false,
      },
      status: {
        // page status
        name: "idle",
        msg: "", // if Error this could trigger "toast" with message
      },
      currentUser: {
        data: {},
        membershipsByProject: new Set(),
      },
      organizationId: null,
      emailEnabled: false,
      Organization: {
        name: "Organization",
        data: {},
        init: false,
        setList: new Set(),
        map: new Map(),
      },
      Affiliation: {
        name: "Affiliation",
        init: false,
        setList: new Set(),
        map: new Map(),
        userMap: new Map(),
        emailMap: new Map(),
        usernameToUserMap: new Map(),
      },
      Bucket: {
        name: "Bucket",
        init: false,
        setList: new Set(),
        map: new Map(),
      },
      Invitation: {
        name: "Invitation",
        init: false,
        setList: new Set(),
        map: new Map(),
      },
      JobCluster: {
        name: "JobCluster",
        init: false,
        setList: new Set(),
        map: new Map(),
      },
      HostedTemplate: {
        name: "HostedTemplate",
        init: false,
        setList: new Set(),
        map: new Map(),
      },
      Project: {
        name: "Project",
        init: false,
        setList: new Set(),
        map: new Map(),
        versionMap: new Map(),
      },
      Membership: {
        name: "Membership",
        init: false,
        setList: new Set(),
        map: new Map(),
        usernameMembershipsMap: new Map(),
        projectIdMembersMap: new Map(),
        usernameProjectIdMap: new Map(),
      },

      deletePermission: false,
      isStaff: false,
      init: async () => {
        Promise.all([
          fetchCredentials(`/rest/User/GetCurrent`, {}, true)
            .then((response) => response.json()),
          fetchCredentials('/rest/Announcements', {}, true)
            .then((response) => response.json()),
          fetchCredentials(`/rest/Organization/${organizationId}`, {}, true)
            .then((response) => response.json()),
        ]).then((values) => {
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
          set({ currentUser: { ...get().currentUser, data: values[0] } });
          set({
            Organization: {
              ...get().Organization,
              init: true,
              data,
              setList,
              map: mapList,
            },
          });
        });
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
        return info.usernameMembershipsMap.get(username); // returns membershipIds
      },

      getProjMembershipData: async (projectId) => {
        if (!get()["Membership"].init) await get().fetchMemberships();
        return get()["Membership"].projectIdMembersMap.get(projectId);
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

      /* project */
      setOrganizationData: async (id) => {
        set({
          status: {
            name: "pending",
            msg: "Fetching project data...",
          },
        });

        const object = await fetchWithHttpInfo(`/rest/Organization/${id}`, {}, true);
        const setList = get()["Organization"].setList;
        const map = get()["Organization"].map;

        setList.add(object.data.id);
        map.set(object.data.id, object.data);

        set({ organizationId: object.data.id });
        set({
          Organization: {
            ...get().Organization,
            init: true,
            setList,
            map,
            data: object.data,
          },
        });

        set({
          status: {
            name: "idle",
            msg: "",
          },
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
        set({
          status: {
            ...get().status,
            name: "bg-fetch",
            msg: `Adding ${type}...`,
          },
        });
        try {
          if (get().Project.versionMap.has(projectId)) {
            return get().Project.versionMap.get(projectId);
          } else {
            const object = await fetchWithHttpInfo(`/rest/Versions/${projectId}`, {}, true);

            if (object.response.ok) {
              const map = get().Project.versionMap;
              map.set(projectId, object.data);
              set({ Project: { ...get().Project, versionMap: map } });
              return object.data;
            } else {
              console.error("Object response not ok...", object);
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
        set({
          status: {
            ...get().status,
            name: "bg-fetch",
            msg: `Adding ${type}...`,
          },
        });
        try {
          const fn = async (organizationId) => {
            let url;
            if (type == "Project") {
              url = `/rest/Projects?organization=${organizationId}`;
            } else {
              url = `/rest/${listResources[type]}/${organizationId}`;
            }
            return await fetchWithHttpInfo(url, {}, true);
          };
          let orgId = organizationId;

          const object = await fn(orgId);
          console.log(`DEBUG: fetchTypeByOrg ${type} response....`, object);

          if (object.response.ok) {
            const setList = new Set();
            const map = new Map();
            const userMap = new Map();
            const emailMap = new Map();

            /* Add the data via loop to: setList and map */
            let loopData =
              type === "Organization" ? [object.data] : object.data;
            for (let item of loopData) {
              setList.add(item.id);
              map.set(item.id, item);

              if (type == "Affiliation") {
                // to tie to for project membership info
                userMap.set(item.username, item);

                // to tie to invitations
                emailMap.set(item.email, item);
              }
            }

            if (type == "Organization") {
              set({
                [type]: {
                  ...get()[type],
                  setList,
                  map,
                  data: object.data,
                  init: true,
                },
              });
            } else if (type == "Affiliation") {
              set({
                [type]: {
                  ...get()[type],
                  setList,
                  map,
                  userMap,
                  emailMap,
                  init: true,
                },
              });
            } else {
              set({ [type]: { ...get()[type], setList, map, init: true } });
            }

            // Init related types
            if (type == "Invitation") {
              await get().initType("Affiliation");
            } else if ("Affiliation") {
              await get().initType("Project");
            } else if (type == "Project") {
              // check membership info of Projects
              await get().fetchMemberships();
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

      fetchMemberships: async () => {
        set({
          status: {
            ...get().status,
            name: "bg-fetch",
            msg: `Setting up Memberships...`,
          },
        });

        await get().initType("Project");
        const projectList = get().Project.map;
        const currentUserId = get().currentUser.data.id;
        const fn = async (projectId) => {
          const url = `/rest/Memberships/${projectId}`;
          return await fetchWithHttpInfo(url, {}, true);
        };
        const map = new Map();
        const currentUserMap = new Set();
        const usernameMembershipsMap = new Map();
        const usernameProjectIdMap = new Map();
        const projectIdMembersMap = new Map();
        const setList = new Set();

        try {
          for (const [projectId, project] of projectList) {
            const object = await fn(projectId);

            // Get memberships for each project, and loop the data
            if (object.response.ok) {
              // // To accomplish: get me memberships for project ID X
              const memberList = object.data;
              projectIdMembersMap.set(projectId, memberList);

              // /* Add the data via loop to: setList and map */
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
                let userList = usernameMembershipsMap.has(username)
                  ? usernameMembershipsMap.get(username)
                  : [];
                userList.push(membershipId);
                userList = [...new Set(userList)];
                usernameMembershipsMap.set(item.username, userList);

                //
                let projectList = usernameProjectIdMap.has(username)
                  ? usernameProjectIdMap.get(username)
                  : [];
                projectList.push(projectId);
                projectList = [...new Set(projectList)];
                usernameProjectIdMap.set(item.username, projectList);

                /* */
                if (
                  item.user === currentUserId &&
                  item.permission === "Full Control"
                ) {
                  currentUserMap.add(projectId);
                }
              }
            } else {
              console.error("Object response not ok for fetchType", object);
            }
          }

          set({
            Membership: {
              ...get().Membership,
              map,
              setList,
              usernameMembershipsMap,
              projectIdMembersMap,
              usernameProjectIdMap,
              init: true,
            },
          });
          set({
            currentUser: {
              ...get().currentUser,
              membershipsByProject: currentUserMap,
            },
          });

          // Success: Return status to idle (handles page spinner)
          set({ status: { ...get().status, name: "idle", msg: "" } });
        } catch (err) {
          // Error: Return status to idle (handles page spinner)
          console.error("Fetch type hit an issue.", err);
          set({ status: { ...get().status, name: "idle", msg: "" } });
          return err;
        }
      },

      getUser: async (username) => {
        if (get().Affiliation.usernameToUserMap.has(username)) {
          return get().Affiliation.usernameToUserMap.get(username);
        } else {
          try {
            const usernameToUserMap = new Map();
            const responseInfo = await fetchWithHttpInfo(`/rest/Users?username=${username}`, {}, true);
            const userData = responseInfo.data[0];
            usernameToUserMap.set(username, userData);
            set({ Affiliation: { ...get().Affiliation, usernameToUserMap } });
            return userData;
          } catch (err) {
            console.error(err);
          }
        }
      },
      addTypeSingle: async ({ type, data }) => {
        set({
          status: {
            ...get().status,
            name: "pending",
            msg: `Adding ${type}...`,
          },
        });
        const responseInfo = await get().addType({ type, data });

        // Refresh all the data
        await get().fetchTypeByOrg(type);

        // Select the new type
        let newID = responseInfo.data.id ? responseInfo.data.id : "New";
        window.location = `${window.location.origin}${window.location.pathname}#${type}-${newID}`;

        set({ status: { ...get().status, name: "idle", msg: "" } });

        // Refresh the page data before setting the selection
        return responseInfo;
      },
      addTypeArray: async ({ type, data }) => {
        set({
          status: {
            ...get().status,
            name: "pending",
            msg: `Adding multiple ${type}...`,
          },
        });

        let responseInfo = null;
        const responses = [];
        for await (let d of data) {
          responseInfo = await get().addType({ type, data: d });
          responses.push(responseInfo);
        }

        // Refresh all the data
        await get().fetchTypeByOrg(type);

        // Select the LAST new type
        //Response should have the newly added ID

        if (responseInfo?.data?.id) {
          const newID = responseInfo?.data?.id ? responseInfo.data.id : "New";
          window.location = `${window.location.origin}${window.location.pathname}#${type}-${newID}`;
        }

        set({ status: { ...get().status, name: "idle", msg: "" } });

        // Refresh the page data before setting the selection
        return responses;
      },
      addType: async ({ type, data }) => {
        try {
          const fn = async (organizationId, body) => {
            const url = `/rest/listResources[type]/${organizationId}`;
            return await fetchWithHttpInfo(url, {
              method: "POST",
              body: JSON.stringify(body),
            });
          };
          const organizationId = get().organizationId;
          return await fn(organizationId, data);
        } catch (err) {
          set({ status: { ...get().status, name: "idle", msg: "" } });
          return err;
        }
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
            const url = `/rest/${detailResources[type]}/${id}`;
            return await fetchWithHttpInfo(url, {
              method: "PATCH",
              body: JSON.stringify(body),
            });
          };
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
        set({
          status: { ...get().status, name: "pending", msg: "Delete type..." },
        });
        try {
          const fn = async (id) => {
            const url = `/rest/${detailResources[type]}/${id}`;
            return await fetchWithHttpInfo(url, {
              method: "DELETE",
            });
          };
          const object = await fn(id);

          await get().fetchTypeByOrg(type);

          return object;
        } catch (err) {
          console.log(err);
          set({ status: { ...get().status, name: "idle", msg: "" } });
          return err;
        }
      },
      resetInvitation: async (inviteSpec) => {
        set({
          status: {
            ...get().status,
            name: "pending",
            msg: "Reseting invitation...",
          },
        });
        try {
          const type = "Invitation";
          const fn = async (id) => {
            const url = `/rest/Invitation/${id}`;
            return await fetchWithHttpInfo(url, {
              method: "DELETE",
            });
          };
          const object = await fn(inviteSpec.id);

          const createFn = async (organizationId, body) => {
            const url = `/rest/Invitations/${organizationId}`;
            return await fetchWithHttpInfo(url, {
              method: "POST",
              body: JSON.stringify(body),
            });
          }
          const objectCreate = await createFn(get().organizationId, {
            email: inviteSpec.email,
            permission: inviteSpec.permission,
          });

          get().setSelection({
            typeName: "Invitation",
            typeId: objectCreate.data.id,
            inner: false,
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
        const userProjects = info.userMap.has(username)
          ? info.userMap.has(username)
          : [];
        return userProjects;
      },
      addMembership: async ({
        projectId,
        formData,
        newVersion = false,
        newVersionName = "",
      }) => {
        set({
          status: {
            ...get().status,
            name: "pending",
            msg: "Adding membership...",
          },
        });
        try {
          if (newVersion) {
            const info = await fetchWithHttpInfo(`/rest/Versions/${projectId}`, {
              method: "POST",
              body: JSON.stringify({
                name: newVersionName,
              }),
            });
            if (info.response.ok) {
              const newVersionId = info.data?.id ? info.data.id : null;
              formData.default_version = newVersionId;
            }
          }

          const info = await fetchWithHttpInfo(`/rest/Memberships/${projectId}`, {
            method: "POST",
            body: JSON.stringify(formData),
          });

          await get().fetchMemberships();
          return info;
        } catch (err) {
          set({ status: { ...get().status, name: "idle", msg: "" } });
          return err;
        }
      },
      updateMembership: async ({ membershipId, formData }) => {
        set({
          status: {
            ...get().status,
            name: "pending",
            msg: "Updating membership...",
          },
        });
        try {
          const info = await api.updateMembershipWithHttpInfo(
            membershipId,
            formData
          );

          await get().fetchMemberships();

          return info;
        } catch (err) {
          set({ status: { ...get().status, name: "idle", msg: "" } });
          return err;
        }
      },
      addProject: async (projectSpec, preset) => {
        let info = await api.createProjectWithHttpInfo({
          ...projectSpec,
          organization: get().organizationId,
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
          await get().fetchTypeByOrg("Project");
          await get().fetchMemberships();
        }

        return info;
      },
    })
  )
);

const loopList = ({ list, skip, check, type }) => {
  let newList = [
    {
      value: -1,
      label: "Select",
    },
  ];

  for (let item of list) {
    const id = item.id;
    if (typeof item !== "undefined" && id !== skip) {
      newList.push({
        id: id,
        value: item.id,
        name: item.name,
        label: item.name,
        checked: check === id || (Array.isArray(check) && check.includes(id)),
        selected: check === id || (Array.isArray(check) && check.includes(id)),
      });
    }
  }

  return newList;
};

const loopMap = ({ map, skip, check, type }) => {
  let newList = [
    {
      value: -1,
      label: "Select",
    },
  ];

  for (let [id, item] of map) {
    if (typeof item !== "undefined" && id !== skip && !skip.includes(id)) {
      newList.push({
        id: id,
        value: item.id,
        name: item.name,
        label: item.name,
        checked: check === id || (Array.isArray(check) && check.includes(id)),
        selected: check === id || (Array.isArray(check) && check.includes(id)),
      });
    }
  }

  return newList;
};

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
    newList = loopMap({ map, skip, check, type });
  }

  return newList;
};

/**
 * Returns a list usable version for settings page's enum
 * @param {Object} args
 * @returns
 */
export const getCompiledVersionList = async ({
  projectId,
  skip = null,
  check = null,
}) => {
  await store.getState().initType("Project");
  const versions = await store.getState().getVersions(projectId);
  let newList = [];

  if (versions && versions.length) {
    newList = loopList({ list: versions, skip, check, type: "Version" });
  }

  return newList;
};

export { store };
