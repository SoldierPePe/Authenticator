<template>
  <div>
    <a-text-input
      :label="i18n.issuer"
      v-model="newAccount.issuer"
    ></a-text-input>
    <a-text-input
      :label="i18n.secret"
      v-model="newAccount.secret"
    ></a-text-input>
    <details>
      <summary>{{ i18n.advanced }}</summary>
      <a-text-input
        :label="i18n.accountName"
        v-model="newAccount.account"
      ></a-text-input>
      <label>{{ i18n.period }}</label>
      <input
        type="number"
        min="1"
        class="input"
        v-model.number="newAccount.period"
        :disabled="newAccount.type === OTPType.hotp"
      />
      <a-select-input :label="i18n.digits" v-model="newAccount.digits">
        <option value="6">6</option>
        <option value="8">8</option>
      </a-select-input>
      <a-select-input :label="i18n.algorithm" v-model="newAccount.algorithm">
        <option :value="OTPAlgorithm.SHA1">SHA-1</option>
        <option :value="OTPAlgorithm.SHA256">SHA-256</option>
        <option :value="OTPAlgorithm.SHA512">SHA-512</option>
        <option :value="OTPAlgorithm.GOST3411_2012_256">GOST 34.11 256</option>
        <option :value="OTPAlgorithm.GOST3411_2012_512">GOST 34.11 512</option>
      </a-select-input>
      <a-select-input :label="i18n.type" v-model.number="newAccount.type">
        <option :value="OTPType.totp">{{ i18n.based_on_time }}</option>
        <option :value="OTPType.hotp">{{ i18n.based_on_counter }}</option>
        <option :value="OTPType.battle">Battle.net</option>
        <option :value="OTPType.steam">Steam</option>
      </a-select-input>
    </details>
    <a-button type="small" @click="addNewAccount()">{{ i18n.ok }}</a-button>
  </div>
</template>
<script setup lang="ts">
import { reactive, getCurrentInstance } from "vue";
import { OTPType, OTPEntry, OTPAlgorithm } from "../../models/otp";

import { useAccountsStore } from "../../store/Accounts";
import { useStyleStore } from "../../store/Style";
import { useNotificationStore } from "../../store/Notification";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const accounts = useAccountsStore();
const styleStore = useStyleStore();
const notificationStore = useNotificationStore();

const newAccount = reactive({
  issuer: "",
  account: "",
  secret: "",
  type: OTPType.totp as OTPType,
  period: undefined as number | undefined,
  digits: 6,
  algorithm: OTPAlgorithm.SHA1 as OTPAlgorithm,
});

async function addNewAccount() {
  newAccount.secret = newAccount.secret.replace(/ /g, "");

  if (newAccount.secret.length < 16) {
    notificationStore.alert(i18n.errorsecret);
    return;
  }

  if (
    !/^[a-z2-7]+=*$/i.test(newAccount.secret) &&
    !/^[0-9a-f]+$/i.test(newAccount.secret)
  ) {
    notificationStore.alert(i18n.errorsecret);
    return;
  }
  let type: OTPType;
  if (
    !/^[a-z2-7]+=*$/i.test(newAccount.secret) &&
    /^[0-9a-f]+$/i.test(newAccount.secret) &&
    newAccount.type === OTPType.totp
  ) {
    type = OTPType.hex;
  } else if (
    !/^[a-z2-7]+=*$/i.test(newAccount.secret) &&
    /^[0-9a-f]+$/i.test(newAccount.secret) &&
    newAccount.type === OTPType.hotp
  ) {
    type = OTPType.hhex;
  } else {
    type = newAccount.type;
  }

  if (type === OTPType.hhex || type === OTPType.hotp) {
    newAccount.period = undefined;
  } else if (typeof newAccount.period !== "number" || newAccount.period < 1) {
    newAccount.period = undefined;
  }

  const defaultEncyptionKey = accounts.defaultEncryption;
  const encryption = accounts.encryption[defaultEncyptionKey];

  const entry = new OTPEntry(
    {
      type,
      index: 0,
      issuer: newAccount.issuer,
      account: newAccount.account,
      encrypted: false,
      secret: newAccount.secret,
      counter: 0,
      period: newAccount.period,
      digits: newAccount.digits,
      algorithm: newAccount.algorithm,
    },
    encryption,
  );

  await entry.create();
  await accounts.addCode(entry);
  styleStore.hideInfo();
  styleStore.toggleEdit();

  const codes = document.getElementById("codes");
  if (codes) {
    // wait vue apply changes to dom
    setTimeout(() => {
      codes.scrollTop = 0;
    }, 0);
  }
  return;
}
</script>
