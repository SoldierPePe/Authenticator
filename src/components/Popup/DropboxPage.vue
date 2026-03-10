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
import { Dropbox } from "../../models/backup";
import { UserSettings } from "../../models/settings";

import { useAccountsStore } from "../../store/Accounts";
import { useBackupStore } from "../../store/Backup";
import { useNotificationStore } from "../../store/Notification";
import { useStyleStore } from "../../store/Style";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const service = "dropbox";

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
    return backupStore.dropboxEncrypted;
  },
  set(newValue: string) {
    UserSettings.items.dropboxEncrypted = newValue === "true";
    UserSettings.commitItems();
    backupStore.setEnc({ service, value: newValue });
  },
});

const backupToken = computed(() => backupStore.dropboxToken);

function getBackupToken() {
  chrome.runtime.sendMessage({ action: service });
}

async function backupLogout() {
  await new Promise((resolve: (value: boolean) => void) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.dropboxapi.com/2/auth/token/revoke");
    xhr.setRequestHeader(
      "Authorization",
      "Bearer " + UserSettings.items.dropboxToken,
    );
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        resolve(true);
        return;
      }
    };
    xhr.send();
  });
  UserSettings.removeItem(`${service}Token`);
  backupStore.setToken({ service, value: false });
  styleStore.hideInfo();
}

async function backupUpload() {
  const dbox = new Dropbox();
  const response = await dbox.upload(accounts.encryption);
  if (response === true) {
    notificationStore.alert(i18n.updateSuccess);
  } else if (UserSettings.items.dropboxRevoked === true) {
    notificationStore.alert(
      chrome.i18n.getMessage("token_revoked", ["Dropbox"]),
    );
    UserSettings.removeItem("dropboxToken");
    backupStore.setToken({ service, value: false });
  } else {
    notificationStore.alert(i18n.updateFailure);
  }
}

async function getUser() {
  const dbox = new Dropbox();
  return await dbox.getUser();
}

onMounted(async () => {
  if (backupToken.value) {
    email.value = await getUser();
  }
});
</script>
