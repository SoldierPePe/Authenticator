import { defineStore } from "pinia";
import { useStyleStore } from "./Style";

function isCustomEvent(event: Event): event is CustomEvent {
  return "detail" in event;
}

export const useNotificationStore = defineStore("notification", {
  state: () => ({
    message: [] as string[], // Message content for alert with ok button
    confirmMessage: "", // Message content for alert with yes / no
    messageIdle: true, // Should show alert box?
    notification: "", // Ephermal message text
  }),
  actions: {
    alert(message: string) {
      this.message.unshift(message);
    },
    closeAlert() {
      this.messageIdle = false;
      this.message.shift();
      setTimeout(() => {
        this.messageIdle = true;
      }, 200);
    },
    setConfirm(message: string) {
      this.confirmMessage = message;
    },
    async confirm(message: string): Promise<boolean> {
      return new Promise((resolve: (value: boolean) => void) => {
        this.confirmMessage = message;
        window.addEventListener("confirm", (event) => {
          this.confirmMessage = "";
          if (!isCustomEvent(event)) {
            resolve(false);
            return;
          }
          resolve(event.detail);
          return;
        });
      });
    },
    ephermalMessage(message: string) {
      this.notification = message;
      const styleStore = useStyleStore();
      styleStore.showNotification();
    },
  },
});
