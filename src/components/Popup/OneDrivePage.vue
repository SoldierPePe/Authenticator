<template>
  <div>
    <div>
      <div class="text warning" v-show="!isEncrypted || !defaultEncryption">
        {{ i18n.dropbox_risk }}
      </div>
      <div v-show="backupToken">
        <div style="margin: 10px 0px 0px 20px; overflow-wrap: break-word">
          {{ i18n.account }} - {{ email }}
        </div>
      </div>
      <a-select-input
        v-show="!!defaultEncryption && backupToken"
        :label="i18n.encrypted"
        v-model="isEncrypted"
      >
        <option value="true">{{ i18n.yes }}</option>
        <option value="false">{{ i18n.no }}</option>
      </a-select-input>
      <a-button v-show="backupToken" @click="backupLogout()">
        {{ i18n.log_out }}
      </a-button>
      <a-button v-show="!backupToken" @click="getBackupToken()">
        {{ i18n.sign_in }}
      </a-button>
      <a-button v-show="!backupToken" @click="getBackupToken(true)">
        {{ i18n.sign_in_business }}
      </a-button>
      <div class="text" v-show="!backupToken">
        <a
          v-on:click="openLink('https://otp.ee/onedriveperms')"
          href="https://otp.ee/onedriveperms"
          >{{ i18n.onedrive_business_perms }}</a
        >
      </div>
      <a-button v-show="backupToken" @click="backupUpload()">
        {{ i18n.manual_dropbox }}
      </a-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import { OneDrive } from "../../models/backup";
import { UserSettings } from "../../models/settings";

import { useAccountsStore } from "../../store/Accounts";
import { useBackupStore } from "../../store/Backup";
import { useNotificationStore } from "../../store/Notification";
import { useStyleStore } from "../../store/Style";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const service = "onedrive";

const accounts = useAccountsStore();
const backupStore = useBackupStore();
const notificationStore = useNotificationStore();
const styleStore = useStyleStore();

const email = ref(i18n.loading);

// Run on setup (equivalent of created())
UserSettings.updateItems();

const defaultEncryption = computed(() => accounts.defaultEncryption);

const isEncrypted = computed({
  get(): boolean {
    if (UserSettings.items.oneDriveEncrypted === null) {
      backupStore.setEnc({ service, value: true });
      UserSettings.items.oneDriveEncrypted = true;
      UserSettings.commitItems();
      return true;
    }
    return backupStore.driveEncrypted;
  },
  set(newValue: string) {
    UserSettings.items.driveEncrypted = newValue === "true";
    UserSettings.commitItems();
    backupStore.setEnc({ service, value: newValue });
  },
});

const backupToken = computed(() => backupStore.oneDriveToken);

function openLink(url: string) {
  window.open(url, "_blank");
  return;
}

function getBackupToken(business?: boolean) {
  UserSettings.items.oneDriveBusiness = Boolean(business);
  UserSettings.commitItems();
  chrome.runtime.sendMessage({ action: service });
}

async function backupLogout() {
  UserSettings.items.oneDriveToken = undefined;
  UserSettings.items.oneDriveRefreshToken = undefined;
  UserSettings.commitItems();
  backupStore.setToken({ service, value: false });
  styleStore.hideInfo();
}

async function backupUpload() {
  const oneDrive = new OneDrive();
  const response = await oneDrive.upload(accounts.encryption);
  if (response === true) {
    notificationStore.alert(i18n.updateSuccess);
  } else if (UserSettings.items.oneDriveRevoked === true) {
    notificationStore.alert(
      chrome.i18n.getMessage("token_revoked", ["OneDrive"]),
    );
    UserSettings.removeItem("oneDriveRevoked");
    backupStore.setToken({ service, value: false });
  } else {
    notificationStore.alert(i18n.updateFailure);
  }
}

async function getUser() {
  const oneDrive = new OneDrive();
  return await oneDrive.getUser();
}

onMounted(async () => {
  if (backupToken.value) {
    email.value = await getUser();
  }
});
</script>
