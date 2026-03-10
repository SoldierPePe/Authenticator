import { defineStore } from "pinia";
import { isSafari } from "../browser";
import { UserSettings } from "../models/settings";
import { ManagedStorage } from "../models/storage";

function resize(zoom: number) {
  if (zoom !== 100) {
    document.body.style.marginBottom = 480 * (zoom / 100 - 1) + "px";
    document.body.style.marginRight = 320 * (zoom / 100 - 1) + "px";
    document.body.style.transform = "scale(" + zoom / 100 + ")";
  }
}

export const useMenuStore = defineStore("menu", {
  state: () => ({
    version: "0.0.0",
    zoom: 100,
    useAutofill: false,
    smartFilter: false,
    enableContextMenu: false,
    theme: isSafari ? "flat" : "normal",
    autolock: 30,
    backupDisabled: false,
    exportDisabled: false,
    enforcePassword: false,
    enforceAutolock: false,
    storageArea: undefined as "sync" | "local" | undefined,
    feedbackURL: undefined as string | undefined,
    passwordPolicy: undefined as string | undefined,
    passwordPolicyHint: undefined as string | undefined,
  }),
  actions: {
    async init() {
      await UserSettings.updateItems();

      this.version = chrome.runtime.getManifest()?.version || "0.0.0";
      this.zoom = Number(UserSettings.items.zoom) || 100;
      this.useAutofill = UserSettings.items.autofill === true;
      this.smartFilter = UserSettings.items.smartFilter === true;
      this.enableContextMenu = UserSettings.items.enableContextMenu === true;
      this.theme = UserSettings.items.theme || (isSafari ? "flat" : "normal");
      this.autolock = Number(UserSettings.items.autolock) || 30;
      this.backupDisabled = await ManagedStorage.get("disableBackup", false);
      this.exportDisabled = await ManagedStorage.get("disableExport", false);
      this.enforcePassword = await ManagedStorage.get("enforcePassword", false);
      this.enforceAutolock = await ManagedStorage.get("enforceAutolock", false);
      this.storageArea = await ManagedStorage.get<"sync" | "local">(
        "storageArea",
      );
      this.feedbackURL = await ManagedStorage.get<string>("feedbackURL");
      this.passwordPolicy = await ManagedStorage.get<string>("passwordPolicy");
      this.passwordPolicyHint =
        await ManagedStorage.get<string>("passwordPolicyHint");

      resize(this.zoom);
    },
    setZoom(zoom: number) {
      this.zoom = zoom;
      UserSettings.items.zoom = zoom;
      UserSettings.commitItems();
      resize(zoom);
    },
    setAutofill(useAutofill: boolean) {
      this.useAutofill = useAutofill;
      UserSettings.items.autofill = useAutofill;
      UserSettings.commitItems();
    },
    setSmartFilter(smartFilter: boolean) {
      this.smartFilter = smartFilter;
      UserSettings.items.smartFilter = smartFilter;
      UserSettings.commitItems();
    },
    setEnableContextMenu(enableContextMenu: boolean) {
      this.enableContextMenu = enableContextMenu;
      UserSettings.items.enableContextMenu = enableContextMenu;
      UserSettings.commitItems();
    },
    setTheme(theme: string) {
      this.theme = theme;
      UserSettings.items.theme = theme;
      UserSettings.commitItems();
    },
    setAutolock(autolock: number) {
      this.autolock = autolock;
      UserSettings.items.autolock = autolock;
      UserSettings.commitItems();
    },
  },
});
