<template>
  <a
    role="button"
    data-x-role="entry"
    v-bind:tabindex="tabindex"
    v-bind:class="{
      entry: true,
      pinnedEntry: entry.pinned,
      'no-copy': noCopy(entry.code),
      filtered: filtered,
      notSearched: notSearched,
    }"
    v-on:click="copyCode(entry)"
    v-on:keydown.enter="copyCode(entry)"
  >
    <div class="deleteAction" v-on:click="removeEntry(entry)">
      <IconMinusCircle />
    </div>
    <div
      class="sector"
      v-if="entry.type !== OTPType.hotp && entry.type !== OTPType.hhex"
      v-show="sectorStart"
    >
      <svg viewBox="0 0 16 16">
        <circle
          cx="8"
          cy="8"
          r="4"
          v-bind:style="{
            animationDuration: entry.period + 's',
            animationDelay: (sectorOffset % entry.period) + 's',
          }"
        />
      </svg>
    </div>
    <div
      v-bind:class="{ counter: true, disabled: style.hotpDiabled }"
      v-if="entry.type === OTPType.hotp || entry.type === OTPType.hhex"
      v-on:click="nextCode(entry)"
    >
      <IconRedo />
    </div>
    <div class="issuer">
      {{
        entry.issuer.split("::")[0] +
        (theme === "compact" ? ` (${entry.account})` : "")
      }}
    </div>
    <div class="issuerEdit">
      <input
        v-bind:placeholder="i18n.issuer"
        type="text"
        v-model="entry.issuer"
        v-on:change="entry.update(encryption)"
      />
    </div>
    <div
      v-bind:class="{
        code: true,
        hotp: entry.type === OTPType.hotp || entry.type === OTPType.hhex,
        timeout: entry.period - (second % entry.period) < 5,
      }"
      v-html="style.isEditing ? showBulls(entry) : showCode(entry.code)"
    ></div>
    <div class="issuer account">{{ entry.account }}</div>
    <div class="issuerEdit">
      <input
        v-bind:placeholder="i18n.accountName"
        type="text"
        v-model="entry.account"
        v-on:change="entry.update(encryption)"
      />
    </div>
    <div
      class="showqr"
      v-if="shouldShowQrIcon(entry)"
      v-on:click.stop="showQr(entry)"
    >
      <IconQr />
    </div>
    <div class="pin" v-on:click.stop="pin(entry)">
      <IconPin />
    </div>
    <div class="movehandle">
      <IconBars />
    </div>
  </a>
</template>
<script setup lang="ts">
import { getCurrentInstance } from "vue";
import { storeToRefs } from "pinia";
import QRGen from "qrcode-generator";
import { OTPEntry, OTPType, CodeState, OTPAlgorithm } from "../../models/otp";
import { EntryStorage } from "../../models/storage";
import { getCurrentTab, okToInjectContentScript } from "../../utils";

import IconMinusCircle from "../../../svg/minus-circle.svg";
import IconRedo from "../../../svg/redo.svg";
import IconQr from "../../../svg/qrcode.svg";
import IconBars from "../../../svg/bars.svg";
import IconPin from "../../../svg/pin.svg";

import { useAccountsStore } from "../../store/Accounts";
import { useStyleStore } from "../../store/Style";
import { useMenuStore } from "../../store/Menu";
import { useQrStore } from "../../store/Qr";
import { useCurrentViewStore } from "../../store/CurrentView";
import { useNotificationStore } from "../../store/Notification";

const i18n = getCurrentInstance()!.appContext.config.globalProperties.i18n;

const accounts = useAccountsStore();
const styleStore = useStyleStore();
const menuStore = useMenuStore();
const qrStore = useQrStore();
const currentViewStore = useCurrentViewStore();
const notificationStore = useNotificationStore();

const {
  OTPType: OTPTypeRef,
  sectorStart,
  sectorOffset,
  second,
  encryption,
} = storeToRefs(accounts);
const { style } = storeToRefs(styleStore);
const { theme } = storeToRefs(menuStore);

defineProps<{
  entry: OTPEntry;
  tabindex: number;
  filtered: boolean;
  notSearched: boolean;
}>();

defineOptions({ inheritAttrs: false });

function noCopy(code: string) {
  return (
    code === CodeState.Encrypted ||
    code === CodeState.Invalid ||
    code.startsWith("&bull;")
  );
}

function shouldShowQrIcon(entry: OTPEntry) {
  return (
    !menuStore.exportDisabled &&
    entry.secret !== null &&
    entry.type !== OTPType.battle &&
    entry.type !== OTPType.steam
  );
}

function showCode(code: string) {
  if (code === CodeState.Encrypted) {
    return i18n.encrypted;
  } else if (code === CodeState.Invalid) {
    return i18n.invalid;
  } else {
    return code;
  }
}

function showBulls(entry: OTPEntry) {
  if (entry.code === CodeState.Encrypted) {
    return i18n.encrypted;
  } else if (entry.code === CodeState.Invalid) {
    return i18n.invalid;
  }

  if (entry.code.startsWith("&bull;")) {
    return entry.code;
  }

  return new Array(entry.digits).fill("&bull;").join("");
}

async function removeEntry(entry: OTPEntry) {
  if (await notificationStore.confirm(i18n.confirm_delete)) {
    await entry.delete();
    await accounts.deleteCode(entry.hash);
  }
  return;
}

async function pin(entry: OTPEntry) {
  accounts.pinEntry(entry);
  await EntryStorage.set(accounts.entries);
  const codesEl = document.getElementById("codes") as HTMLDivElement;
  codesEl.scrollTop = 0;
}

function showQr(entry: OTPEntry) {
  qrStore.setQr(getQrUrl(entry));
  styleStore.showQr();
  return;
}

async function nextCode(entry: OTPEntry) {
  if (styleStore.style.hotpDisabled) {
    return;
  }
  styleStore.toggleHotpDisabled();
  await entry.next();
  setTimeout(() => {
    styleStore.toggleHotpDisabled();
  }, 3000);
  return;
}

async function copyCode(entry: OTPEntry) {
  if (
    styleStore.style.isEditing ||
    entry.code === CodeState.Invalid ||
    entry.code.startsWith("&bull;")
  ) {
    return;
  }

  if (entry.code === CodeState.Encrypted) {
    styleStore.showInfo(true);
    currentViewStore.changeView("EnterPasswordPage");
    return;
  }

  chrome.permissions.request(
    { permissions: ["clipboardWrite"] },
    async (granted) => {
      if (granted) {
        const codeClipboard = document.getElementById(
          "codeClipboard",
        ) as HTMLInputElement;
        if (!codeClipboard) {
          return;
        }

        if (menuStore.useAutofill) {
          await insertContentScript();
          const tab = await getCurrentTab();
          if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: "pastecode",
              code: entry.code,
            });
          }
        }

        const lastActiveElement = document.activeElement as HTMLElement;
        codeClipboard.value = entry.code;
        codeClipboard.focus();
        codeClipboard.select();
        document.execCommand("Copy");
        lastActiveElement.focus();
        notificationStore.ephermalMessage(i18n.copied);
      }
    },
  );

  return;
}

// TODO: move most of this to a models file and reuse for backup stuff
function getQrUrl(entry: OTPEntry) {
  const label = entry.issuer
    ? entry.issuer + ":" + entry.account
    : entry.account;
  const type =
    entry.type === OTPType.hex
      ? OTPType[OTPType.totp]
      : entry.type === OTPType.hhex
        ? OTPType[OTPType.hotp]
        : OTPType[entry.type];
  const otpauth =
    "otpauth://" +
    type +
    "/" +
    encodeURIComponent(label) +
    "?secret=" +
    entry.secret +
    (entry.issuer
      ? "&issuer=" + encodeURIComponent(entry.issuer.split("::")[0])
      : "") +
    (entry.type === OTPType.hotp || entry.type === OTPType.hhex
      ? "&counter=" + entry.counter
      : "") +
    (entry.type === OTPType.totp && entry.period !== 30
      ? "&period=" + entry.period
      : "") +
    (entry.digits !== 6 ? "&digits=" + entry.digits : "") +
    (entry.algorithm !== OTPAlgorithm.SHA1
      ? "&algorithm=" + OTPAlgorithm[entry.algorithm]
      : "");
  const qr = QRGen(0, "L");
  qr.addData(otpauth);
  qr.make();
  return qr.createDataURL(5);
}

async function insertContentScript() {
  let tab = await getCurrentTab();
  if (okToInjectContentScript(tab)) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/dist/content.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["/css/content.css"],
    });
  }
}
</script>
