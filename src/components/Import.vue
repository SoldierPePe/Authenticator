<template>
  <div id="import" class="theme-normal">
    <div v-if="!shouldShowPassphrase">
      <div class="import_tab">
        <input
          type="radio"
          id="import_file_radio"
          value="FileImport"
          v-model="importType"
        />
        <label for="import_file_radio">{{ i18n.import_backup_file }}</label>
        <input
          type="radio"
          id="import_qr_radio"
          value="QrImport"
          v-model="importType"
        />
        <label for="import_qr_radio">{{ i18n.import_backup_qr }}</label>
        <input
          type="radio"
          id="import_code_radio"
          value="TextImport"
          v-model="importType"
        />
        <label for="import_code_radio">{{ i18n.import_backup_code }}</label>
      </div>
      <div>
        <p id="import_info">
          {{ i18n.otp_backup_inform }}
          <a href="https://otp.ee/otpbackup" target="_blank">{{
            i18n.otp_backup_learn
          }}</a>
        </p>
      </div>
      <component :is="currentComponent" />
    </div>
    <div v-if="shouldShowPassphrase" class="error_password">
      {{ i18n.import_error_password }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import type { Component } from "vue";
import FileImport from "./Import/FileImport.vue";
import QrImport from "./Import/QrImport.vue";
import TextImport from "./Import/TextImport.vue";

const instance = getCurrentInstance()!;
const entries = instance.appContext.config.globalProperties
  .$entries as OTPEntryInterface[];

const components: Record<string, Component> = {
  FileImport,
  QrImport,
  TextImport,
};

const query = location.search ? location.search.substr(1) : "";
const importType = ref(
  ["FileImport", "QrImport", "TextImport"].includes(query)
    ? query
    : "FileImport",
);
const shouldShowPassphrase = ref(checkShouldShowPassphrase(entries));

const currentComponent = computed(() => components[importType.value]);

onMounted(() => {
  chrome.runtime.onMessage.addListener((event) => {
    if (event.action === "stopImport") {
      shouldShowPassphrase.value = true;
    }

    // https://stackoverflow.com/a/56483156
    return true;
  });
});

function checkShouldShowPassphrase(entries: OTPEntryInterface[]) {
  for (const entry of entries) {
    if (!entry.secret) {
      return true;
    }
  }
  return false;
}
</script>
