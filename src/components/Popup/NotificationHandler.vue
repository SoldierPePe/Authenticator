<template>
  <div>
    <!-- MESSAGE -->
    <div class="message-box" v-show="message.length && messageIdle">
      <div>{{ message.length ? message[0] : "" }}</div>
      <a-button type="small" @click="closeAlert()">{{ i18n.ok }}</a-button>
    </div>

    <!-- CONFIRM -->
    <div class="message-box" v-show="confirmMessage !== ''">
      <div>{{ confirmMessage }}</div>
      <div class="buttons">
        <a-button type="small" @click="confirmOK()">{{ i18n.yes }}</a-button>
        <a-button type="small" @click="confirmCancel()">
          {{ i18n.no }}
        </a-button>
      </div>
    </div>

    <!-- OVERLAY -->
    <div
      id="overlay"
      v-show="(message.length && messageIdle) || confirmMessage !== ''"
    ></div>
  </div>
</template>
<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNotificationStore } from "../../store/Notification";

const notificationStore = useNotificationStore();

const { message, messageIdle, confirmMessage } = storeToRefs(notificationStore);

function closeAlert() {
  notificationStore.closeAlert();
}

function confirmOK() {
  const confirmEvent = new CustomEvent("confirm", { detail: true });
  window.dispatchEvent(confirmEvent);
  return;
}

function confirmCancel() {
  const confirmEvent = new CustomEvent("confirm", { detail: false });
  window.dispatchEvent(confirmEvent);
  return;
}
</script>
