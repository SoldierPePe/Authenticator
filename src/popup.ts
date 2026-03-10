// Vue
import { createApp } from "vue";
import { createPinia } from "pinia";

// Components
import Popup from "./components/Popup.vue";
import CommonComponents from "./components/common/index";

// Other
import { loadI18nMessages } from "./store/i18n";
import { useStyleStore } from "./store/Style";
import { useAccountsStore } from "./store/Accounts";
import { useBackupStore } from "./store/Backup";
import { useCurrentViewStore } from "./store/CurrentView";
import { useMenuStore } from "./store/Menu";
import { useNotificationStore } from "./store/Notification";
import { useQrStore } from "./store/Qr";
import { useAdvisorStore } from "./store/Advisor";
import { Dropbox, Drive, OneDrive } from "./models/backup";
import { syncTimeWithGoogle } from "./syncTime";
import { StorageLocation, UserSettings } from "./models/settings";

async function migrateLocalStorageToBrowserStorage() {
  if (localStorage.length > 0) {
    const location =
      (localStorage.storageLocation as StorageLocation) || StorageLocation.Sync;
    await UserSettings.convertFromLocalStorage(localStorage, location);
    localStorage.clear();
  }
}

async function init() {
  await migrateLocalStorageToBrowserStorage();
  await UserSettings.updateItems();

  // Load i18n messages
  const i18n = await loadI18nMessages();

  // Create app and pinia
  const pinia = createPinia();
  const app = createApp(Popup);
  app.use(pinia);

  // Add globals
  app.config.globalProperties.i18n = i18n;

  // Load common components globally
  for (const component of CommonComponents) {
    app.component(component.name, component.component);
  }

  // Initialize stores
  const accounts = useAccountsStore();
  const advisor = useAdvisorStore();
  const backup = useBackupStore();
  const currentView = useCurrentViewStore();
  const menu = useMenuStore();
  const notification = useNotificationStore();
  const style = useStyleStore();

  await accounts.init();
  await advisor.init();
  await backup.init();
  await menu.init();

  // Mount the app
  app.mount("#tauth");

  // Update time based entries' codes
  accounts.updateCodes();
  setInterval(() => {
    accounts.updateCodes();
  }, 1000);

  // Prompt for password if needed
  if (accounts.shouldShowPassphrase) {
    // If we have cached password, use that
    if (accounts.defaultEncryption) {
      currentView.changeView("LoadingPage");
      await accounts.updateEntries();
    } else {
      style.showInfo(true);
      currentView.changeView("EnterPasswordPage");
    }
  } else {
    // Set init complete if no encryption is present, otherwise this will be set in updateEntries.
    accounts.setInitComplete();
  }

  // Auto focus on first entry
  document.querySelector<HTMLAnchorElement>("a.entry[tabindex='0']")?.focus();

  // Set document title
  try {
    document.title = i18n.extName;
  } catch (e) {
    console.error(e);
  }

  // Warn if legacy password is set
  if (UserSettings.items.encodedPhrase) {
    notification.alert(i18n.local_passphrase_warning);
  }

  // Backup reminder / run backup
  const backupReminder = setInterval(() => {
    if (accounts.entries.length === 0) {
      return;
    }

    if (accounts.currentlyEncrypted) {
      return;
    }

    clearInterval(backupReminder);

    const clientTime = Math.floor(new Date().getTime() / 1000 / 3600 / 24);
    if (!UserSettings.items.lastRemindingBackupTime) {
      UserSettings.items.lastRemindingBackupTime = clientTime;
      UserSettings.commitItems();
    } else if (
      clientTime - Number(UserSettings.items.lastRemindingBackupTime) >= 30 ||
      clientTime - Number(UserSettings.items.lastRemindingBackupTime) < 0
    ) {
      runScheduledBackup(clientTime, i18n);
    }
    return;
  }, 5000);

  // Open search if '/' is pressed
  document.addEventListener(
    "keyup",
    (e) => {
      if (e.key === "/") {
        if (style.isMenuShown) {
          return;
        }
        accounts.stopFilter();
        // It won't focus the texfield if vue unhides the div
        accounts.showSearchBar();
        const searchDiv = document.getElementById("search");
        const searchInput = document.getElementById("searchInput");
        if (!searchInput || !searchDiv) {
          return;
        }
        searchDiv.style.display = "block";
        searchInput.focus();
      }
    },
    false,
  );

  // Show search box if more than 10 entries
  if (
    accounts.entries.length >= 10 &&
    !(accounts.shouldFilter && accounts.filter)
  ) {
    accounts.showSearchBar();
  }

  const query = new URLSearchParams(document.location.search.substring(1));
  // Resize window to proper size if popup
  if (query.get("popup")) {
    const zoom = Number(UserSettings.items.zoom) / 100 || 1;
    const correctHeight = 480 * zoom;
    const correctWidth = 320 * zoom;
    if (
      window.innerHeight !== correctHeight ||
      window.innerWidth !== correctWidth
    ) {
      // window update to correct size
      const adjustedHeight =
        correctHeight + (window.outerHeight - window.innerHeight);
      const adjustedWidth =
        correctWidth + (window.outerWidth - window.innerWidth);
      chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {
        height: adjustedHeight,
        width: adjustedWidth,
      });
    }
  }

  // TODO: give an option for this
  chrome.permissions.contains(
    { origins: ["https://www.google.com/"] },
    (hasPermission) => {
      if (hasPermission) {
        syncTimeWithGoogle();
      }
    },
  );
}

init();

async function runScheduledBackup(
  clientTime: number,
  i18n: Record<string, string>,
) {
  const accounts = useAccountsStore();
  const backup = useBackupStore();
  const notification = useNotificationStore();

  if (backup.dropboxToken) {
    chrome.permissions.contains(
      { origins: ["https://*.dropboxapi.com/*"] },
      async (hasPermission) => {
        if (hasPermission) {
          try {
            const dropbox = new Dropbox();
            const res = await dropbox.upload(
              accounts.encryption.get(accounts.defaultEncryption),
            );
            if (res) {
              // we have uploaded backup to Dropbox
              // no need to remind
              UserSettings.items.lastRemindingBackupTime = clientTime;
              UserSettings.commitItems();
              return;
            } else if (UserSettings.items.dropboxRevoked === true) {
              notification.alert(
                chrome.i18n.getMessage("token_revoked", ["Dropbox"]),
              );
              UserSettings.items.dropboxRevoked = undefined;
              UserSettings.removeItem("dropboxRevoked");
            }
          } catch (error) {
            // ignore
          }
        }
        notification.alert(i18n.remind_backup);
        UserSettings.items.lastRemindingBackupTime = clientTime;
        UserSettings.commitItems();
      },
    );
  }
  if (backup.driveToken) {
    chrome.permissions.contains(
      {
        origins: [
          "https://www.googleapis.com/*",
          "https://accounts.google.com/o/oauth2/revoke",
        ],
      },
      async (hasPermission) => {
        if (hasPermission) {
          try {
            const drive = new Drive();
            const res = await drive.upload(
              accounts.encryption.get(accounts.defaultEncryption),
            );
            if (res) {
              UserSettings.items.lastRemindingBackupTime = clientTime;
              UserSettings.commitItems();
              return;
            } else if (UserSettings.items.driveRevoked === true) {
              notification.alert(
                chrome.i18n.getMessage("token_revoked", ["Google Drive"]),
              );
              UserSettings.items.driveRevoked = undefined;
              UserSettings.removeItem("driveRevoked");
            }
          } catch (error) {
            // ignore
          }
        }
        notification.alert(i18n.remind_backup);
        UserSettings.items.lastRemindingBackupTime = clientTime;
        UserSettings.commitItems();
      },
    );
  }
  if (backup.oneDriveToken) {
    chrome.permissions.contains(
      {
        origins: [
          "https://graph.microsoft.com/me/*",
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        ],
      },
      async (hasPermission) => {
        if (hasPermission) {
          try {
            const onedrive = new OneDrive();
            const res = await onedrive.upload(
              accounts.encryption.get(accounts.defaultEncryption),
            );
            if (res) {
              UserSettings.items.lastRemindingBackupTime = clientTime;
              UserSettings.commitItems();
              return;
            } else if (UserSettings.items.oneDriveRevoked === true) {
              notification.alert(
                chrome.i18n.getMessage("token_revoked", ["OneDrive"]),
              );
              UserSettings.items.oneDriveRevoked = undefined;
              UserSettings.removeItem("oneDriveRevoked");
            }
          } catch (error) {
            // ignore
          }
        }
        notification.alert(i18n.remind_backup);
        UserSettings.items.lastRemindingBackupTime = clientTime;
        UserSettings.commitItems();
      },
    );
  }
  if (!backup.driveToken && !backup.dropboxToken && !backup.oneDriveToken) {
    notification.alert(i18n.remind_backup);
    UserSettings.items.lastRemindingBackupTime = clientTime;
    UserSettings.commitItems();
  }
}
