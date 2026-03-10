<template>
  <div>
    <!-- File Backup -->
    <div v-show="!exportDisabled">
      <div class="text warning" v-if="!defaultEncryption">
        {{ i18n.export_info }}
      </div>
      <div class="text">
        {{ i18n.backup_file_info }}
      </div>
      <div class="text warning" v-if="unsupportedAccounts">
        {{ i18n.otp_unsupported_warn }}
      </div>
      <div class="text warning" v-if="currentlyEncrypted">
        {{ i18n.phrase_incorrect_export }}
      </div>
      <a-button-link
        download="tauth.txt"
        :href="exportOneLineOtpAuthFile"
        v-if="!unsupportedAccounts && isDataLinkSupported"
        >{{ i18n.download_backup }}</a-button-link
      >
      <button
        v-on:click="downloadBackUpOneLineOtpAuthFile()"
        v-if="!unsupportedAccounts && !isDataLinkSupported"
        class="button"
      >
        {{ i18n.download_backup }}
      </button>
      <a-button-link
        download="tauth.json"
        :href="exportFile"
        v-if="unsupportedAccounts && isDataLinkSupported"
        >{{ i18n.download_backup }}</a-button-link
      >
      <button
        v-on:click="downloadBackUpExportFile()"
        v-if="unsupportedAccounts && !isDataLinkSupported"
        class="button"
      >
        {{ i18n.download_backup }}
      </button>
      <a-button-link
        download="tauth.json"
        :href="exportEncryptedFile"
        v-if="!!defaultEncryption && isDataLinkSupported"
        >{{ i18n.download_enc_backup }}</a-button-link
      >
      <button
        v-on:click="downloadBackUpExportEncryptedFile()"
        v-if="!!defaultEncryption && !isDataLinkSupported"
        class="button"
      >
        {{ i18n.download_enc_backup }}
      </button>
    </div>
    <a-button-link href="import.html">{{ i18n.import_backup }}</a-button-link>
    <br />
    <!-- 3rd Party Backup Services -->
    <div v-show="!backupDisabled && isBackupServiceSupported">
      <div class="text">
        {{ i18n.storage_sync_info }}
      </div>
      <p></p>
      <a-button @click="showInfo('DrivePage')"> Google Drive </a-button>
      <a-button @click="showInfo('OneDrivePage')"> OneDrive </a-button>
      <a-button @click="showInfo('DropboxPage')"> Dropbox </a-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
import { isSafari } from "../../browser";

import { useAccountsStore } from "../../store/Accounts";
import { useMenuStore } from "../../store/Menu";
import { useStyleStore } from "../../store/Style";
import { useCurrentViewStore } from "../../store/CurrentView";

const accounts = useAccountsStore();
const menuStore = useMenuStore();
const styleStore = useStyleStore();
const currentViewStore = useCurrentViewStore();

const exportData = accounts.exportData;
const exportEncData = accounts.exportEncData;
const key = (accounts as any).key;

const unsupportedAccounts = ref(hasUnsupportedAccounts(exportData));
const exportFile = ref(getBackupFile(exportData));
const exportEncryptedFile = ref(getBackupFile(exportEncData, key));
const exportOneLineOtpAuthFile = ref(getOneLineOtpBackupFile(exportData));

const defaultEncryption = computed(() => accounts.defaultEncryption);
const exportDisabled = computed(() => menuStore.exportDisabled);
const currentlyEncrypted = computed(() => accounts.currentlyEncrypted);
const backupDisabled = computed(() => menuStore.backupDisabled);
const isDataLinkSupported = computed(() => !isSafari);
const isBackupServiceSupported = computed(() => !isSafari);

function showInfo(tab: string) {
  if (tab === "DropboxPage") {
    chrome.permissions.request(
      { origins: ["https://*.dropboxapi.com/*"] },
      async (granted) => {
        if (granted) {
          styleStore.showInfo();
          currentViewStore.changeView(tab);
        }
      },
    );
    return;
  } else if (tab === "DrivePage") {
    chrome.permissions.request(
      {
        origins: [
          "https://www.googleapis.com/*",
          "https://accounts.google.com/o/oauth2/revoke",
        ],
      },
      async (granted) => {
        if (granted) {
          styleStore.showInfo();
          currentViewStore.changeView(tab);
        }
        return;
      },
    );
    return;
  } else if (tab === "OneDrivePage") {
    chrome.permissions.request(
      {
        origins: [
          "https://graph.microsoft.com/me/*",
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        ],
      },
      async (granted) => {
        if (granted) {
          styleStore.showInfo();
          currentViewStore.changeView(tab);
        }
        return;
      },
    );
    return;
  }
}

function downloadBackUpOneLineOtpAuthFile() {
  const exportData = accounts.exportData;
  const t = getOneLineOtpBackupFile(exportData);
  window.open(t);
}

function downloadBackUpExportFile() {
  const exportData = accounts.exportData;
  const t = getBackupFile(exportData);
  window.open(t);
}

function downloadBackUpExportEncryptedFile() {
  const exportEncData = accounts.exportEncData;
  const key = (accounts as any).key;
  const t = getBackupFile(exportEncData, key);
  window.open(t);
}

function hasUnsupportedAccounts(exportData: { [h: string]: RawOTPStorage }) {
  for (const entry of Object.keys(exportData)) {
    if (
      exportData[entry].type === "battle" ||
      exportData[entry].type === "steam"
    ) {
      return true;
    }
  }
  return false;
}

function getBackupFile(
  entryData: { [hash: string]: RawOTPStorage },
  key?: Object,
) {
  if (key) {
    Object.assign(entryData, { key: key });
  }
  let json = JSON.stringify(entryData, null, 2);
  // for windows notepad
  json = json.replace(/\n/g, "\r\n");
  return downloadFileUrlBuilder(json);
}

function getOneLineOtpBackupFile(entryData: { [hash: string]: RawOTPStorage }) {
  const otpAuthLines: string[] = [];
  for (const hash of Object.keys(entryData)) {
    const otpStorage = entryData[hash];
    if (otpStorage.issuer) {
      otpStorage.issuer = removeUnsafeData(otpStorage.issuer);
    }
    if (otpStorage.account) {
      otpStorage.account = removeUnsafeData(otpStorage.account);
    }
    const label = otpStorage.issuer
      ? otpStorage.issuer + ":" + (otpStorage.account || "")
      : otpStorage.account || "";
    let type = "";
    if (otpStorage.type === "totp" || otpStorage.type === "hex") {
      type = "totp";
    } else if (otpStorage.type === "hotp" || otpStorage.type === "hhex") {
      type = "hotp";
    } else {
      continue;
    }

    const otpAuthLine =
      "otpauth://" +
      type +
      "/" +
      label +
      "?secret=" +
      otpStorage.secret +
      (otpStorage.issuer ? "&issuer=" + otpStorage.issuer : "") +
      (type === "hotp" ? "&counter=" + otpStorage.counter : "") +
      (type === "totp" && otpStorage.period
        ? "&period=" + otpStorage.period
        : "") +
      (otpStorage.digits ? "&digits=" + otpStorage.digits : "") +
      (otpStorage.algorithm ? "&algorithm=" + otpStorage.algorithm : "");

    otpAuthLines.push(otpAuthLine);
  }

  return downloadFileUrlBuilder(otpAuthLines.join("\r\n"));
}

function downloadFileUrlBuilder(content: string) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  return URL.createObjectURL(blob);
}

function removeUnsafeData(data: string) {
  return encodeURIComponent(data.split("::")[0].replace(/:/g, ""));
}
</script>
