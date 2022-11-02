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
   organizationId: null,
   deletePermission: false,
   isStaff: false,

})));


export { store };