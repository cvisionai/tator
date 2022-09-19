import create from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { Utils } from 'tator';

const api = Utils.getApi();

const store = create(subscribeWithSelector((set, get) => ({
  projects: [],
  organizations: [],
  fetchProjects: async () => {
    set({ projects: await api.getProjectList() });
  },
  fetchOrganizations: async () => {
    set({ organizations: await api.getOrganizationList() });
  },
  addProject: async (projectSpec) => {
    const response = await api.createProject(projectSpec);
    set({ projects: get().projects.push(response.object) });
  },
  removeProject: async (id) => {
    const response = await api.deleteProject(id);
    set({ projects: get().projects.filter(project => project.id != id) });
  }
})));

export {store};

