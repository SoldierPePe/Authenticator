// Vue
import { createApp } from "vue";
import { createPinia } from "pinia";

// Components
import PermissionsView from "./components/Permissions.vue";
import CommonComponents from "./components/common/index";

// Other
import { loadI18nMessages } from "./store/i18n";
import { usePermissionsStore } from "./store/Permissions";

async function init() {
  // Load i18n messages
  const i18n = await loadI18nMessages();

  // Create app and pinia
  const pinia = createPinia();
  const app = createApp(PermissionsView);
  app.use(pinia);

  // Add globals
  app.config.globalProperties.i18n = i18n;

  // Load common components globally
  for (const component of CommonComponents) {
    app.component(component.name, component.component);
  }

  // Initialize permissions store
  const permissions = usePermissionsStore();
  await permissions.init();

  // Mount the app
  app.mount("#permissions");

  // Set title
  try {
    document.title = i18n.extName;
  } catch (e) {
    console.error(e);
  }
}

init();
