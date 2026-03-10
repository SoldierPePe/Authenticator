import { defineStore } from "pinia";
import { EntryStorage } from "../models/storage";
import { InsightLevel, AdvisorInsight } from "../models/advisor";
import { StorageLocation, UserSettings } from "../models/settings";

const insightsData: AdvisorInsightInterface[] = [
  {
    id: "passwordNotSet",
    level: InsightLevel.danger,
    description: chrome.i18n.getMessage("advisor_insight_password_not_set"),
    validation: async () => {
      const hasEncryptedEntry = await EntryStorage.hasEncryptionKey();
      return !hasEncryptedEntry;
    },
  },
  {
    id: "autoLockNotSet",
    level: InsightLevel.warning,
    description: chrome.i18n.getMessage("advisor_insight_auto_lock_not_set"),
    validation: async () => {
      await UserSettings.updateItems();
      const hasEncryptedEntry = await EntryStorage.hasEncryptionKey();
      return hasEncryptedEntry && !Number(UserSettings.items.autolock);
    },
  },
  {
    id: "browserSyncNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_browser_sync_not_enabled",
    ),
    validation: async () => {
      await UserSettings.updateItems();
      const storageArea = UserSettings.items.storageLocation;
      return storageArea !== StorageLocation.Sync;
    },
  },
  {
    id: "autoFillNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_auto_fill_not_enabled",
    ),
    validation: async () => {
      await UserSettings.updateItems();
      return UserSettings.items.autofill !== true;
    },
  },
  {
    id: "smartFilterNotEnabled",
    level: InsightLevel.info,
    description: chrome.i18n.getMessage(
      "advisor_insight_smart_filter_not_enabled",
    ),
    validation: async () => {
      await UserSettings.updateItems();
      return UserSettings.items.smartFilter === false;
    },
  },
];

async function getInsights(): Promise<AdvisorInsight[]> {
  await UserSettings.updateItems();
  const advisorIgnoreList: string[] =
    typeof UserSettings.items.advisorIgnoreList === "string"
      ? JSON.parse(UserSettings.items.advisorIgnoreList || "[]")
      : UserSettings.items.advisorIgnoreList || [];

  const filteredInsightsData: AdvisorInsightInterface[] = [];

  for (const insightData of insightsData) {
    if (advisorIgnoreList.includes(insightData.id)) {
      continue;
    }

    const validation = await insightData.validation();

    if (validation) {
      filteredInsightsData.push(insightData);
    }
  }

  return filteredInsightsData.map(
    (insightData) => new AdvisorInsight(insightData),
  );
}

export const useAdvisorStore = defineStore("advisor", {
  state: () => ({
    insights: [] as AdvisorInsight[],
    ignoreList: [] as string[],
  }),
  actions: {
    async init() {
      await UserSettings.updateItems();
      this.insights = await getInsights();
      this.ignoreList = UserSettings.items.advisorIgnoreList || [];
    },
    async dismissInsight(insightId: string) {
      this.ignoreList.push(insightId);
      UserSettings.items.advisorIgnoreList = this.ignoreList;
      UserSettings.commitItems();

      this.insights = await getInsights();
    },
    async clearIgnoreList() {
      this.ignoreList = [];
      UserSettings.items.advisorIgnoreList = undefined;
      UserSettings.commitItems();

      this.insights = await getInsights();
    },
    async updateInsight() {
      this.insights = await getInsights();
      this.ignoreList =
        typeof UserSettings.items.advisorIgnoreList === "string"
          ? JSON.parse(UserSettings.items.advisorIgnoreList || "[]")
          : UserSettings.items.advisorIgnoreList || [];
    },
  },
});
