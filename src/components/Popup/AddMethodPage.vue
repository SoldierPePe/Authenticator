<template>
  <div>
    <a-button @click="beginCapture()">{{ i18n.add_qr }}</a-button>
    <a-button @click="showInfo('AddAccountPage')">
      {{ i18n.add_secret }}
    </a-button>
    <a-button-link href="import.html?QrImport">{{
      i18n.import_qr_images
    }}</a-button-link>
    <a-button-link href="import.html?TextImport">{{
      i18n.import_otp_urls
    }}</a-button-link>
  </div>
</template>
<script setup lang="ts">
import { getCurrentInstance } from "vue";
import { getCurrentTab, okToInjectContentScript } from "../../utils";

import { useAccountsStore } from "../../store/Accounts";
import { useStyleStore } from "../../store/Style";
import { useCurrentViewStore } from "../../store/CurrentView";
import { useNotificationStore } from "../../store/Notification";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const accounts = useAccountsStore();
const styleStore = useStyleStore();
const currentViewStore = useCurrentViewStore();
const notificationStore = useNotificationStore();

function showInfo(page: string) {
  if (accounts.currentlyEncrypted) {
    notificationStore.alert(i18n.phrase_incorrect);
    return;
  }
  styleStore.showInfo();
  currentViewStore.changeView(page);
}

async function beginCapture() {
  if (accounts.currentlyEncrypted) {
    notificationStore.alert(i18n.phrase_incorrect);
    return;
  }

  // Insert content script
  const tab = await getCurrentTab();
  if (okToInjectContentScript(tab)) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/dist/content.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["/css/content.css"],
    });

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
