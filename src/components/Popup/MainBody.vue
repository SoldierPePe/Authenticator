<template>
  <div
    id="codes"
    v-bind:class="{ filter: shouldFilter && filter, search: showSearch }"
  >
    <!-- Filter -->
    <div class="under-header" id="filter" v-on:click="clearFilter()">
      {{ i18n.show_all_entries }}
    </div>
    <!-- Search -->
    <div class="under-header" id="search">
      <input
        id="searchInput"
        v-model="searchText"
        v-bind:placeholder="i18n.search"
        type="text"
        tabindex="-1"
      />
      <div id="searchHint" v-if="searchText === ''">
        <div></div>
        <div id="searchHintBorder">/</div>
        <div></div>
      </div>
    </div>
    <!-- Entries -->
    <div
      ref="entriesContainer"
      v-on:keydown.down="focusNextEntry()"
      v-on:keydown.right="focusNextEntry()"
      v-on:keydown.up="focusLastEntry()"
      v-on:keydown.left="focusLastEntry()"
    >
      <EntryComponent
        v-for="entry in entries"
        :key="entry.hash"
        v-bind:filtered="!entry.pinned && !isMatchedEntry(entry)"
        v-bind:notSearched="!isSearchedEntry(entry)"
        v-bind:entry="entry"
        v-bind:tabindex="getTabindex(entry)"
      />
      <div class="no-entry" v-if="entries.length === 0 && initComplete">
        <IconKey />
        <p>
          {{ i18n.no_entires }}
          <a href="#" v-on:click="openLink('https://otp.ee/quickstart')">{{
            i18n.learn_more
          }}</a>
        </p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import Sortable from "sortablejs";
import { OTPEntry } from "../../models/otp";
import { EntryStorage } from "../../models/storage";

import EntryComponent from "./EntryComponent.vue";
import IconKey from "../../../svg/key-solid.svg";

import { useAccountsStore } from "../../store/Accounts";
import { useStyleStore } from "../../store/Style";

const accounts = useAccountsStore();
const styleStore = useStyleStore();

const { filter, showSearch, initComplete } = storeToRefs(accounts);
const { style } = storeToRefs(styleStore);

const shouldFilter = computed(() => accounts.shouldFilter);
const entries = computed(() => accounts.sortedEntries);
const matchedEntries = computed(() => accounts.matchedEntries);

const searchText = ref("");
const entriesContainer = ref<HTMLElement | null>(null);

let sortableInstance: Sortable | null = null;

onMounted(() => {
  if (entriesContainer.value) {
    sortableInstance = Sortable.create(entriesContainer.value, {
      handle: ".movehandle",
      animation: 150,
      disabled: !style.value.isEditing,
      onEnd: async (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
          accounts.moveCode({ from: evt.oldIndex, to: evt.newIndex });
          await EntryStorage.set(accounts.entries);
        }
      },
    });
  }
});

watch(
  () => style.value.isEditing,
  (isEditing) => {
    if (sortableInstance) {
      sortableInstance.option("disabled", !isEditing);
    }
  },
);

function openLink(url: string) {
  window.open(url, "_blank");
  return;
}

function isMatchedEntry(entry: OTPEntry) {
  for (const hash of matchedEntries.value) {
    if (entry.hash === hash) {
      return true;
    }
  }
  return false;
}

function isSearchedEntry(entry: OTPEntry) {
  if (searchText.value === "") {
    return true;
  }
  if (
    entry.issuer.toLowerCase().includes(searchText.value.toLowerCase()) ||
    entry.account.toLowerCase().includes(searchText.value.toLowerCase())
  ) {
    return true;
  } else {
    return false;
  }
}

function clearFilter() {
  accounts.clearFilter();
}

function isEntryVisible(entry: OTPEntry) {
  return (
    isSearchedEntry(entry) &&
    (entry.pinned ||
      !shouldFilter.value ||
      !filter.value ||
      isMatchedEntry(entry))
  );
}

function getTabindex(entry: OTPEntry) {
  const firstEntry = entries.value.find((entry: OTPEntry) =>
    isEntryVisible(entry),
  );

  return entry === firstEntry ? 0 : -1;
}

function findNextEntryIndex(reverse: boolean) {
  if (document.activeElement?.getAttribute("data-x-role") !== "entry") {
    return -1;
  }

  const activeIndex = Array.prototype.indexOf.call(
    document.querySelectorAll(".entry"),
    document.activeElement,
  );
  if (activeIndex === -1) {
    return -1;
  }

  // reverse modify origin array, and use slice() to make a clone first
  const _entries = reverse ? entries.value.slice().reverse() : entries.value;

  let nextIndex = _entries.findIndex(
    (entry: OTPEntry, index: number) =>
      index >
        (reverse ? entries.value.length - 1 - activeIndex : activeIndex) &&
      isEntryVisible(entry),
  );

  if (nextIndex === -1) {
    nextIndex = _entries.findIndex((entry: OTPEntry) => isEntryVisible(entry));
  }

  return nextIndex;
}

function focusNextEntry() {
  const nextIndex = findNextEntryIndex(false);
  document
    .querySelector<HTMLLinkElement>(`.entry:nth-child(${nextIndex + 1})`)
    ?.focus();
}

function focusLastEntry() {
  const lastIndex = entries.value.length - 1 - findNextEntryIndex(true);
  document
    .querySelector<HTMLLinkElement>(`.entry:nth-child(${lastIndex + 1})`)
    ?.focus();
}
</script>
