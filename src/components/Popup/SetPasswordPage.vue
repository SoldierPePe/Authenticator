<template>
  <div>
    <div class="text warning">{{ i18n.security_warning }}</div>
    <a-text-input
      :label="i18n.current_phrase"
      type="password"
      v-model="currentPhrase"
      v-show="!!defaultEncryption"
    />
    <a-text-input :label="i18n.phrase" type="password" v-model="phrase" />
    <a-text-input
      :label="i18n.confirm_phrase"
      type="password"
      v-model="confirm"
      @enter="changePassphrase()"
    />
    <div v-show="!enforcePassword">
      <a-button id="security-save" @click="changePassphrase()">
        {{ i18n.ok }}
      </a-button>
      <a-button id="security-remove" @click="removePassphrase()">
        {{ i18n.remove }}
      </a-button>
    </div>
    <a-button type="small" v-show="enforcePassword" @click="changePassphrase()">
      {{ i18n.ok }}
    </a-button>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue";
import { verifyPasswordUsingKeyID } from "../../models/password";

import { useMenuStore } from "../../store/Menu";
import { useAccountsStore } from "../../store/Accounts";
import { useCurrentViewStore } from "../../store/CurrentView";
import { useNotificationStore } from "../../store/Notification";
import { useStyleStore } from "../../store/Style";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const menuStore = useMenuStore();
const accounts = useAccountsStore();
const currentViewStore = useCurrentViewStore();
const notificationStore = useNotificationStore();
const styleStore = useStyleStore();

const phrase = ref("");
const currentPhrase = ref("");
const confirm = ref("");

const enforcePassword = computed(() => menuStore.enforcePassword);

const passwordPolicy = computed(() => {
  if (!menuStore.passwordPolicy) {
    return null;
  }

  try {
    return new RegExp(menuStore.passwordPolicy);
  } catch {
    console.warn(
      "Invalid password policy. The password policy is not a valid regular expression.",
      menuStore.passwordPolicy,
    );
    return null;
  }
});

const passwordPolicyHint = computed(() => menuStore.passwordPolicyHint);
const defaultEncryption = computed(() => accounts.defaultEncryption);

async function removePassphrase() {
  currentViewStore.changeView("LoadingPage");

  if (defaultEncryption.value) {
    const isCorrectPassword = await verifyPasswordUsingKeyID(
      defaultEncryption.value,
      currentPhrase.value,
    );
    if (!isCorrectPassword) {
      notificationStore.alert(i18n.phrase_not_match);
      currentViewStore.changeView("SetPasswordPage");
      return;
    }
  }

  await accounts.changePassphrase("");
  notificationStore.alert(i18n.updateSuccess);
  styleStore.hideInfo();
  return;
}

async function changePassphrase() {
  if (phrase.value === "") {
    return;
  }

  if (passwordPolicy.value && !passwordPolicy.value.test(phrase.value)) {
    const hint = passwordPolicyHint.value || i18n.password_policy_default_hint;
    notificationStore.alert(hint);
    return;
  }

  if (phrase.value !== confirm.value) {
    notificationStore.alert(i18n.phrase_not_match);
    return;
  }

  currentViewStore.changeView("LoadingPage");

  if (defaultEncryption.value) {
    const isCorrectPassword = await verifyPasswordUsingKeyID(
      defaultEncryption.value,
      currentPhrase.value,
    );
    if (!isCorrectPassword) {
      notificationStore.alert(i18n.phrase_wrong);
      currentViewStore.changeView("SetPasswordPage");
      return;
    }
  }

  await accounts.changePassphrase(phrase.value);
  notificationStore.alert(i18n.updateSuccess);
  styleStore.hideInfo();
  return;
}
</script>
