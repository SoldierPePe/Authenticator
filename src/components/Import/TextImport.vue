<template>
  <div>
    <div class="import_code">
      <textarea
        spellcheck="false"
        v-model="importCode"
        placeholder="otpauth://totp/...
otpauth://totp/...
otpauth://hotp/...
..."
      ></textarea>
    </div>
    <div class="import_encrypted">
      <input type="checkbox" id="encryptedCode" v-model="importEncrypted" />
      <label for="encryptedCode">{{ i18n.encrypted }}</label>
    </div>
    <a-text-input
      :label="i18n.phrase"
      v-model="importPassphrase"
      type="password"
      v-show="importEncrypted"
    />
    <a-button @click="importBackupCode()">
      {{ i18n.import_backup_code }}
    </a-button>
  </div>
</template>
<script setup lang="ts">
import * as CryptoJS from "crypto-js";
import { ref, getCurrentInstance } from "vue";
import {
  decryptBackupData,
  getEntryDataFromOTPAuthPerLine,
} from "../../import";
import { EntryStorage } from "../../models/storage";
import { Encryption } from "../../models/encryption";

const instance = getCurrentInstance()!;
const i18n = instance.appContext.config.globalProperties.i18n;
const $encryption = instance.appContext.config.globalProperties.$encryption;

const importCode = ref("");
const importEncrypted = ref(false);
const importPassphrase = ref("");

async function importBackupCode() {
  let exportData: {
    // @ts-ignore
    key?: { enc: string; hash: string };
    [hash: string]: OTPStorage | Key;
  } = {};
  let failedCount = 0;
  let succeededCount = 0;
  try {
    exportData = JSON.parse(importCode.value);
  } catch (error) {
    console.warn(error);
    // Maybe one-otpauth-per line text
    const result = await getEntryDataFromOTPAuthPerLine(importCode.value);
    exportData = result.exportData;
    failedCount = result.failedCount;
    succeededCount = result.succeededCount;
  }

  let key: { enc: string; hash: string } | null = null;

  if (exportData.hasOwnProperty("key")) {
    if (exportData.key) {
      key = exportData.key;
    }
    delete exportData.key;
  }

  try {
    const passphrase: string | null =
      importEncrypted.value && importPassphrase.value
        ? importPassphrase.value
        : null;
    let decryptedbackupData: {
      [hash: string]: RawOTPStorage;
    } = {};
    if (key && passphrase) {
      decryptedbackupData = await decryptBackupData(
        exportData,
        CryptoJS.AES.decrypt(key.enc, passphrase).toString(),
      );
    } else {
      decryptedbackupData = await decryptBackupData(exportData, passphrase);
    }

    if (Object.keys(decryptedbackupData).length) {
      await EntryStorage.import($encryption as Encryption, decryptedbackupData);
      if (failedCount === 0) {
        alert(i18n.updateSuccess);
      } else if (succeededCount) {
        alert(i18n.import_backup_qr_partly_failed);
      } else {
        alert(i18n.updateFailure);
      }
      window.close();
    } else {
      alert(i18n.updateFailure);
    }
    return;
  } catch (error) {
    throw error;
  }
}
</script>
