import { defineStore } from "pinia";

export const useStyleStore = defineStore("style", {
  state: () => ({
    style: {
      timeout: false,
      isEditing: false,
      slidein: false, // menu
      slideout: false, // menu
      fadein: false, // info
      fadeout: false, // info
      show: false, // info
      qrfadein: false,
      qrfadeout: false,
      notificationFadein: false,
      notificationFadeout: false,
      hotpDisabled: false,
    },
  }),
  getters: {
    // Returns true if menu or info screen shown
    isMenuShown(state): boolean {
      return state.style.fadein || state.style.show || state.style.slidein;
    },
  },
  actions: {
    showMenu() {
      this.style.slidein = true;
      this.style.slideout = false;
    },
    hideMenu() {
      this.style.slidein = false;
      this.style.slideout = true;
      setTimeout(() => {
        this.style.slideout = false;
      }, 200);
    },
    showInfo(noAnimate?: boolean) {
      if (noAnimate) {
        this.style.show = true;
      } else {
        this.style.fadein = true;
        this.style.fadeout = false;
      }
    },
    hideInfo(noAnimate?: boolean) {
      if (noAnimate) {
        this.style.show = false;
      } else {
        this.style.fadein = false;
        this.style.fadeout = true;
      }
      setTimeout(() => {
        this.style.fadeout = false;
      }, 200);
    },
    showQr() {
      this.style.qrfadein = true;
      this.style.qrfadeout = false;
    },
    hideQr() {
      this.style.qrfadein = false;
      this.style.qrfadeout = true;
      setTimeout(() => {
        this.style.qrfadeout = false;
      }, 200);
    },
    showNotification() {
      this.style.notificationFadein = true;
      this.style.notificationFadeout = false;
      setTimeout(() => {
        this.style.notificationFadein = false;
        this.style.notificationFadeout = true;
        setTimeout(() => {
          this.style.notificationFadeout = false;
        }, 200);
      }, 1000);
    },
    toggleEdit() {
      this.style.isEditing = !this.style.isEditing;
    },
    toggleHotpDisabled() {
      this.style.hotpDisabled = !this.style.hotpDisabled;
    },
  },
});
