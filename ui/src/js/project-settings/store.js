import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { Utils } from '../../../../scripts/packages/tator-js/pkg/dist/tator.js';

const api = Utils.getApi();
// console.log(api);

const store = create(subscribeWithSelector((set, get) => ({
   versions: [],

   /* versions: fetch, add, remove */
   fetchVersions: async () => {
     set({ versions: await api.getVersionsList() });
   },
   addVersion: async (spec) => {
     let response = await api.createVersion(spec);
     const version = response.object;
     set({ versions: [...get().versions, version] }); // `push` doesn't trigger state update
     return version;
   },
   removeVersion: async (id) => {
     const response = await api.deleteVersion(id);
     console.log(response.message);
     set({ versions: get().versions.filter(version => version.id != id) });
   }
 })));
 
 export { store };