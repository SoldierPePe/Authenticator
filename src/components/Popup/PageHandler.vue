<template>
  <div id="info">
    <div
      id="infoClose"
      v-if="!(info === 'EnterPasswordPage' || info === 'LoadingPage')"
      v-on:click="hideInfo()"
    >
      <IconXCircle />
    </div>
    <component v-bind:is="info" id="infoContent"></component>
  </div>
</template>
<script setup lang="ts">
import { storeToRefs } from "pinia";

import IconXCircle from "../../../svg/x-circle.svg";

import AddAccountPage from "./AddAccountPage.vue";
import AddMethodPage from "./AddMethodPage.vue";
import SetPasswordPage from "./SetPasswordPage.vue";
import EnterPasswordPage from "./EnterPasswordPage.vue";
import BackupPage from "./BackupPage.vue";
import DropboxPage from "./DropboxPage.vue";
import DrivePage from "./DrivePage.vue";
import OneDrivePage from "./OneDrivePage.vue";
import PreferencesPage from "./PreferencesPage.vue";
import AdvisorPage from "./AdvisorPage.vue";
import LoadingPage from "./LoadingPage.vue";

import { useCurrentViewStore } from "../../store/CurrentView";
import { useStyleStore } from "../../store/Style";

const currentViewStore = useCurrentViewStore();
const styleStore = useStyleStore();

const { info } = storeToRefs(currentViewStore);

function hideInfo() {
  styleStore.hideInfo();
}
</script>
