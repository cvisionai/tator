import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { Utils } from 'tator';

const api = Utils.getApi();

const store = create(subscribeWithSelector(async set => ({
  projects: [],
  organizations: [],
})));

export {store, api};

