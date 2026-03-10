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
      <a-button v-show="backupToken" @click="backupUpload()">
        {{ i18n.manual_dropbox }}
      </a-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import { isChrome } from "../../browser";
import { Drive } from "../../models/backup";
import { UserSettings } from "../../models/settings";

import { useAccountsStore } from "../../store/Accounts";
import { useBackupStore } from "../../store/Backup";
import { useNotificationStore } from "../../store/Notification";
import { useStyleStore } from "../../store/Style";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const service = "drive";

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
    if (UserSettings.items[`${service}Encrypted`] === null) {
      backupStore.setEnc({ service, value: true });
      UserSettings.items[`${service}Encrypted`] = true;
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

const backupToken = computed(() => backupStore.driveToken);

function getBackupToken() {
  chrome.runtime.sendMessage({ action: service });
}

async function backupLogout() {
  await new Promise((resolve: (value: boolean) => void) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      "https://accounts.google.com/o/oauth2/revoke?token=" +
        UserSettings.items.driveToken,
    );
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (isChrome) {
          chrome.identity.removeCachedAuthToken(
            { token: UserSettings.items.driveToken as string },
            () => {
              resolve(true);
            },
          );
        } else {
          resolve(true);
        }
        return;
      }
    };
    xhr.send();
  });
  UserSettings.removeItem("driveToken");
  backupStore.setToken({ service, value: false });
  styleStore.hideInfo();
}

async function backupUpload() {
  const drive = new Drive();
  const response = await drive.upload(accounts.encryption);
  if (response === true) {
    notificationStore.alert(i18n.updateSuccess);
  } else if (UserSettings.items.driveRevoked === true) {
    notificationStore.alert(
      chrome.i18n.getMessage("token_revoked", ["Google Drive"]),
    );
    UserSettings.removeItem("driveRevoked");
    backupStore.setToken({ service, value: false });
  } else {
    notificationStore.alert(i18n.updateFailure);
  }
}

async function getUser() {
  const drive = new Drive();
  return await drive.getUser();
}

onMounted(async () => {
  if (backupToken.value) {
    email.value = await getUser();
  }
});
</script>
