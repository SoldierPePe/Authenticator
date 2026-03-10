import { defineStore } from "pinia";

export const useQrStore = defineStore("qr", {
  state: () => ({
    qr: "",
  }),
  actions: {
    setQr(url: string) {
      this.qr = `url(${url})`;
    },
  },
});
