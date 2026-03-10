import { defineStore } from "pinia";
import { UserSettings } from "../models/settings";

export const useBackupStore = defineStore("backup", {
  state: () => ({
    dropboxEncrypted: false,
    driveEncrypted: false,
    oneDriveEncrypted: false,
    dropboxToken: false,
    driveToken: false,
    oneDriveToken: false,
  }),
  actions: {
    async init() {
      await UserSettings.updateItems();

      this.dropboxEncrypted = UserSettings.items.dropboxEncrypted === true;
      this.driveEncrypted = UserSettings.items.driveEncrypted === true;
      this.oneDriveEncrypted = UserSettings.items.oneDriveEncrypted === true;
      this.dropboxToken = Boolean(UserSettings.items.dropboxToken);
      this.driveToken = Boolean(UserSettings.items.driveToken);
      this.oneDriveToken = Boolean(UserSettings.items.oneDriveToken);
    },
    setToken(args: { service: string; value: boolean }) {
      switch (args.service) {
        case "dropbox":
          this.dropboxToken = args.value;
          break;

        case "drive":
          this.driveToken = args.value;
          break;

        case "onedrive":
          this.oneDriveToken = args.value;
          break;

        default:
          break;
      }
    },
    setEnc(args: { service: string; value: boolean }) {
      switch (args.service) {
        case "dropbox":
          this.dropboxEncrypted = args.value;
          break;

        case "drive":
          this.driveEncrypted = args.value;
          break;

        case "onedrive":
          this.oneDriveEncrypted = args.value;
          break;

        default:
          break;
      }
    },
  },
});
