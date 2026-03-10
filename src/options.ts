import { createApp } from "vue";
import OptionsView from "./components/Options.vue";
import { loadI18nMessages } from "./store/i18n";

async function init() {
  // Load i18n messages
  const i18n = await loadI18nMessages();

  // Create and mount app
  const app = createApp(OptionsView);
  app.config.globalProperties.i18n = i18n;
  app.mount("#options");
}

init();
