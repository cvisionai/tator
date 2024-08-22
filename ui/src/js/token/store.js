import create from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";

const store = create(
  subscribeWithSelector((set, get) => ({
    user: null,
    announcements: [],
    init: async () => {
      Promise.all([api.whoami(), api.getAnnouncementList()]).then((values) => {
        set({
          user: values[0],
          announcements: values[1],
        });
      });
    },
  }))
);

export { store };
