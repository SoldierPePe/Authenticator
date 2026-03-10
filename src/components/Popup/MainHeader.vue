<template>
  <div class="header">
    <span v-on:dblclick="popOut()">{{ i18n.extName }}</span>
    <div v-show="!isPopup()">
      <div
        class="icon"
        id="i-menu"
        v-bind:title="i18n.settings"
        v-on:click="showMenu()"
        v-show="!style.isEditing"
      >
        <IconCog />
      </div>
      <div
        class="icon"
        id="i-plus"
        v-bind:title="i18n.add_code"
        v-on:click="showInfo('AddMethodPage')"
        v-show="style.isEditing"
      >
        <IconPlus />
      </div>
      <div
        class="icon"
        id="i-lock"
        v-bind:title="i18n.lock"
        v-on:click="lock()"
        v-show="!style.isEditing && !!defaultEncryption"
      >
        <IconLock />
      </div>
      <div
        class="icon"
        id="i-sync"
        v-bind:style="{
          left: !!defaultEncryption ? '70px' : '45px',
        }"
        v-show="
          (dropboxToken || driveToken || oneDriveToken) && !style.isEditing
        "
      >
        <IconSync />
      </div>
      <div
        class="icon"
        id="i-qr"
        v-bind:title="i18n.add_qr"
        v-show="!style.isEditing"
        v-on:click="beginCapture()"
      >
        <IconScan />
      </div>
      <div
        class="icon"
        id="i-edit"
        v-bind:title="i18n.edit"
        v-if="!style.isEditing"
        v-on:click="editEntry()"
      >
        <IconPencil />
      </div>
      <div
        class="icon"
        id="i-edit"
        v-bind:title="i18n.edit"
        v-else
        v-on:click="editEntry()"
      >
        <IconCheck />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { getCurrentInstance } from "vue";
import { storeToRefs } from "pinia";
import { getCurrentTab, okToInjectContentScript } from "../../utils";

// Icons
import IconCog from "../../../svg/cog.svg";
import IconLock from "../../../svg/lock.svg";
import IconSync from "../../../svg/sync.svg";
import IconScan from "../../../svg/scan.svg";
import IconPencil from "../../../svg/pencil.svg";
import IconCheck from "../../../svg/check.svg";
import IconPlus from "../../../svg/plus.svg";
import { isFirefox } from "../../browser";

import { useStyleStore } from "../../store/Style";
import { useAccountsStore } from "../../store/Accounts";
import { useBackupStore } from "../../store/Backup";
import { useMenuStore } from "../../store/Menu";
import { useCurrentViewStore } from "../../store/CurrentView";
import { useNotificationStore } from "../../store/Notification";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const styleStore = useStyleStore();
const accounts = useAccountsStore();
const backupStore = useBackupStore();
const menuStore = useMenuStore();
const currentViewStore = useCurrentViewStore();
const notificationStore = useNotificationStore();

const { style } = storeToRefs(styleStore);
const { defaultEncryption } = storeToRefs(accounts);
const { driveToken, dropboxToken, oneDriveToken } = storeToRefs(backupStore);

function isPopup() {
  const params = new URLSearchParams(document.location.search.substring(1));
  return params.get("popup");
}

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
  window.close();
}

function showMenu() {
  styleStore.showMenu();
}

function showInfo(page: string) {
  if (page === "AddMethodPage") {
    if (menuStore.enforcePassword && !accounts.defaultEncryption) {
      page = "SetPasswordPage";
    }
  }
  styleStore.showInfo();
  currentViewStore.changeView(page);
}

function editEntry() {
  styleStore.toggleEdit();
  accounts.stopFilter();
}

function lock() {
  chrome.runtime.sendMessage({ action: "lock" }, window.close);
  return;
}

async function beginCapture() {
  if (menuStore.enforcePassword && !accounts.defaultEncryption) {
    styleStore.showInfo();
    currentViewStore.changeView("SetPasswordPage");
    return;
  }

  if (accounts.currentlyEncrypted) {
    notificationStore.alert(i18n.phrase_incorrect);
    return;
  }

  const tab = await getCurrentTab();
  // Insert content script
  if (okToInjectContentScript(tab)) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/dist/content.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["/css/content.css"],
    });

    if (tab.url?.startsWith("file:")) {
      if (await notificationStore.confirm(i18n.capture_local_file_failed)) {
        window.open("import.html?QrImport", "_blank");
        return;
      }
    }

    chrome.runtime.sendMessage({ action: "updateContentTab", data: tab });
    chrome.tabs.sendMessage(tab.id, { action: "capture" }, (result) => {
      if (result !== "beginCapture") {
        notificationStore.alert(i18n.capture_failed);
      } else {
        window.close();
      }
    });
  }
}
</script>
