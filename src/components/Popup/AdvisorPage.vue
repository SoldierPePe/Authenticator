<template>
  <div class="advisor">
    <div v-if="ignoreList.length > 0" class="show-all-insights">
      <a href="#" v-on:click="clearIgnoreList">{{ i18n.show_all_insights }}</a>
    </div>
    <div v-if="insights.length === 0" class="no-insight">
      {{ i18n.no_insight_available }}
    </div>
    <AdvisorInsight
      class="insight"
      v-for="insight in insights"
      :key="insight.id"
      v-bind:insight="insight"
      v-bind:level="insight.level"
    />
  </div>
</template>
<script setup lang="ts">
import { onMounted, getCurrentInstance } from "vue";
import { storeToRefs } from "pinia";
import AdvisorInsight from "./AdvisorInsight.vue";

import { useAdvisorStore } from "../../store/Advisor";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const advisorStore = useAdvisorStore();

const { insights, ignoreList } = storeToRefs(advisorStore);

onMounted(() => {
  advisorStore.updateInsight();
});

function clearIgnoreList() {
  advisorStore.clearIgnoreList();
}
</script>
