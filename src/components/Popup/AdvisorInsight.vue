<template>
  <div>
    <h3>{{ insight.levelText }}</h3>
    <p>{{ insight.description }}</p>
    <div class="link">
      <a v-if="insight.link" href="#" v-on:click="openLink(insight.link)">{{
        i18n.learn_more
      }}</a>
      <a href="#" v-on:click="dismiss(insight)">{{ i18n.dismiss }}</a>
    </div>
  </div>
</template>
<script setup lang="ts">
import { getCurrentInstance } from "vue";
import { AdvisorInsight } from "../../models/advisor";

import { useAdvisorStore } from "../../store/Advisor";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const advisorStore = useAdvisorStore();

defineProps<{
  insight: AdvisorInsight;
}>();

function dismiss(insight: AdvisorInsight) {
  advisorStore.dismissInsight(insight.id);
}

function openLink(url: string) {
  window.open(url, "_blank");
  return;
}
</script>
