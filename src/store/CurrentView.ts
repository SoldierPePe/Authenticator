import { defineStore } from "pinia";

export const useCurrentViewStore = defineStore("currentView", {
  state: () => ({
    info: "",
  }),
  actions: {
    changeView(viewName: string) {
      this.info = viewName;
    },
  },
});
