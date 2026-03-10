<template>
  <div>
    <a-select-input
      :label="i18n.theme"
      v-model="theme"
      style="margin-left: 10px"
    >
      <option value="normal">{{ i18n.theme_light }}</option>
      <option value="dark">{{ i18n.theme_dark }}</option>
      <option value="simple">{{ i18n.theme_simple }}</option>
      <option value="compact">{{ i18n.theme_compact }}</option>
      <option value="accessibility">{{ i18n.theme_high_contrast }}</option>
      <option value="flat">{{ i18n.theme_flat }}</option>
    </a-select-input>
    <a-select-input
      :label="i18n.scale"
      v-model="zoom"
      style="margin-left: 10px"
    >
      <option value="125">125%</option>
      <option value="100">100%</option>
      <option value="90">90%</option>
      <option value="80">80%</option>
      <option value="67">67%</option>
      <option value="57">57%</option>
      <option value="50">50%</option>
      <option value="40">40%</option>
      <option value="33">33%</option>
      <option value="25">25%</option>
      <option value="20">20%</option>
    </a-select-input>
    <a-toggle-input :label="i18n.use_autofill" v-model="useAutofill" />
    <a-toggle-input
      :label="i18n.browser_sync"
      v-model="browserSync"
      :disabled="storageArea"
      @change="migrateStorage()"
    />
    <a-toggle-input :label="i18n.smart_filter" v-model="smartFilter" />
    <a-toggle-input
      :label="i18n.enable_context_menu"
      v-model="enableContextMenu"
      @change="requireContextMenuPermission()"
      v-if="isSupported"
    />
    <div class="control-group" v-show="!!defaultEncryption">
      <label class="combo-label">{{ i18n.autolock }}</label>
      <input
        class="input"
        type="number"
        min="0"
        style="width: 70px; text-align: center"
        v-model="autolock"
        :disabled="Boolean(enforceAutolock)"
      />
      <span class="combo-label" style="margin-left: 0; margin-right: 20px">{{
        i18n.minutes
      }}</span>
    </div>
    <a-button @click="popOut()">{{ i18n.popout }}</a-button>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue";
import { isFirefox, isSafari } from "../../browser";
import { UserSettings } from "../../models/settings";

import { useMenuStore } from "../../store/Menu";
import { useAccountsStore } from "../../store/Accounts";
import { useCurrentViewStore } from "../../store/CurrentView";
import { useNotificationStore } from "../../store/Notification";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const menuStore = useMenuStore();
const accounts = useAccountsStore();
const currentViewStore = useCurrentViewStore();
const notificationStore = useNotificationStore();

const newStorageLocation = ref("");

// Run on setup (equivalent of created())
UserSettings.updateItems().then(() => {
  newStorageLocation.value =
    menuStore.storageArea || UserSettings.items.storageLocation;
});

const zoom = computed({
  get(): number {
    return menuStore.zoom;
  },
  set(val: number) {
    menuStore.setZoom(val);
  },
});

const useAutofill = computed({
  get(): boolean {
    return menuStore.useAutofill;
  },
  set(val: boolean) {
    menuStore.setAutofill(val);
  },
});

const smartFilter = computed({
  get(): boolean {
    return menuStore.smartFilter;
  },
  set(val: boolean) {
    menuStore.setSmartFilter(val);
    notificationStore.alert(i18n.activate_auto_filter);
  },
});

const enableContextMenu = computed({
  get(): boolean {
    return menuStore.enableContextMenu;
  },
  set(val: boolean) {
    menuStore.setEnableContextMenu(val);
  },
});

const theme = computed({
  get(): string {
    return menuStore.theme;
  },
  set(val: string) {
    menuStore.setTheme(val);
  },
});

const defaultEncryption = computed(() => accounts.defaultEncryption);
const enforceAutolock = computed(() => menuStore.enforceAutolock);

const autolock = computed({
  get(): number {
    if (menuStore.enforceAutolock) {
      return menuStore.enforceAutolock;
    } else {
      return menuStore.autolock;
    }
  },
  set(val: number) {
    menuStore.setAutolock(val);
    chrome.runtime.sendMessage({ action: "resetAutolock" });
  },
});

const storageArea = computed(() => menuStore.storageArea);

const browserSync = computed({
  get(): boolean {
    return newStorageLocation.value === "sync";
  },
  set(value: boolean) {
    newStorageLocation.value = value ? "sync" : "local";
  },
});

const isSupported = computed(() => !isFirefox && !isSafari);

function popOut() {
  let windowType;
  if (isFirefox) {
    windowType = "detached_panel";
  } else {
    windowType = "panel";
  }
  chrome.windows.create({
    url: chrome.runtime.getURL("view/popup.html?popup=true"),
    type: windowType as chrome.windows.createTypeEnum,
    height: window.innerHeight,
    width: window.innerWidth,
  });
}

function migrateStorage() {
  currentViewStore.changeView("LoadingPage");
  (accounts.migrateStorage(newStorageLocation.value).then((m: string) => {
    notificationStore.alert(i18n[m]);
    currentViewStore.changeView("PreferencesPage");
  }),
    (r: string) => {
      notificationStore.alert(i18n.updateFailure + r);
      currentViewStore.changeView("PreferencesPage");
    });
}

function requireContextMenuPermission() {
  chrome.permissions.request(
    {
      permissions: ["contextMenus"],
    },
    (granted) => {
      if (!granted) {
        enableContextMenu.value = false;
        return;
      }
      chrome.runtime.sendMessage({
        action: "updateContextMenu",
      });
    },
  );
}
</script>
