import { defineStore } from "pinia";
import { EntryStorage, BrowserStorage, isOldKey } from "../models/storage";
import { Encryption } from "../models/encryption";
import * as CryptoJS from "crypto-js";
import { OTPType, OTPAlgorithm } from "../models/otp";
import { getSiteName, getMatchedEntriesHash } from "../utils";
import { isChromium } from "../browser";
import { StorageLocation, UserSettings } from "../models/settings";
import { DataType } from "../models/otp";
import { useCurrentViewStore } from "./CurrentView";
import { useStyleStore } from "./Style";

const LegacyEncryption = "LegacyEncryption";

async function getCachedKeyInfo() {
  const { cachedPassphrase, cachedKeyId } = await chrome.storage.session.get();

  return { cachedPassphrase, cachedKeyId };
}

async function getEntries() {
  const otpEntries = await EntryStorage.get();
  return otpEntries;
}

async function genHash(value: string) {
  const randomValues = window.crypto.getRandomValues(new Uint16Array(8));
  let salt = "";
  for (const byte of randomValues) {
    salt += byte.toString(16);
  }

  return new Promise((resolve: (value: string) => void) => {
    const iframe = document.getElementById("argon-sandbox");
    const message = {
      action: "hash",
      value: value,
      salt,
    };
    if (iframe) {
      window.addEventListener("message", (response) => {
        resolve(response.data.response);
      });
      // @ts-expect-error bad typings
      iframe.contentWindow.postMessage(message, "*");
    }
  });
}

export const useAccountsStore = defineStore("accounts", {
  state: () => ({
    entries: [] as OTPEntryInterface[],
    encryption: new Map<string, EncryptionInterface>(),
    defaultEncryption: "",
    OTPType,
    OTPAlgorithm,
    shouldShowPassphrase: false,
    sectorStart: false, // Should display timer circles?
    sectorOffset: 0, // Offset in seconds for animations
    second: 0, // Offset in seconds for math
    filter: true,
    siteName: [] as (string | null)[],
    showSearch: false,
    exportData: {} as { [k: string]: OTPEntryInterface },
    exportEncData: {} as { [k: string]: OTPEntryInterface | Key },
    keys: [] as OldKey | Key[],
    wrongPassword: false,
    initComplete: false,
  }),
  getters: {
    shouldFilter(state): boolean {
      return (
        UserSettings.items.smartFilter === true &&
        this.matchedEntries.length > 0
      );
    },
    matchedEntries(state): string[] {
      return getMatchedEntriesHash(state.siteName, state.entries);
    },
    currentlyEncrypted(state): boolean {
      for (const entry of state.entries) {
        if (entry.secret === null) {
          return true;
        }
      }
      return false;
    },
    sortedEntries(state): OTPEntryInterface[] {
      const pinnedEntries = state.entries.filter((entry) => entry.pinned);
      const unpinnedEntries = state.entries.filter((entry) => !entry.pinned);
      return [...pinnedEntries, ...unpinnedEntries];
    },
  },
  actions: {
    async init() {
      const cachedKeyInfo = await getCachedKeyInfo();
      if (cachedKeyInfo.cachedKeyId) {
        this.encryption.set(
          cachedKeyInfo.cachedKeyId,
          new Encryption(
            cachedKeyInfo.cachedPassphrase,
            cachedKeyInfo.cachedKeyId,
          ),
        );
      }
      this.defaultEncryption = cachedKeyInfo.cachedKeyId || "";
      this.shouldShowPassphrase = await EntryStorage.hasEncryptionKey();
      this.entries = this.shouldShowPassphrase ? [] : await getEntries();

      await UserSettings.updateItems();

      this.siteName = await getSiteName();
      this.exportData = await EntryStorage.getExport(this.entries);
      this.exportEncData = await EntryStorage.getExport(this.entries, true);
      this.keys = await BrowserStorage.getKeys();
    },
    stopFilter() {
      this.filter = false;
    },
    showSearchBar() {
      this.showSearch = true;
    },
    updateCodes() {
      let second = new Date().getSeconds();
      if (UserSettings.items.offset) {
        // prevent second from negative
        second += Number(UserSettings.items.offset) + 60;
      }

      second = second % 60;
      this.second = second;

      let currentlyEncrypted = false;

      for (const entry of this.entries) {
        if (entry.secret === null) {
          currentlyEncrypted = true;
        }
      }

      if (!this.sectorStart && this.entries.length > 0 && !currentlyEncrypted) {
        this.sectorStart = true;
        this.sectorOffset = -second;
      }

      const entries = this.entries as OTPEntryInterface[];
      for (let i = 0; i < entries.length; i++) {
        if (
          entries[i].type !== OTPType.hotp &&
          entries[i].type !== OTPType.hhex
        ) {
          entries[i].generate();
        }
      }
    },
    loadCodes(newCodes: OTPEntryInterface[]) {
      this.entries = newCodes;
    },
    moveCode(opts: { from: number; to: number }) {
      this.entries.splice(opts.to, 0, this.entries.splice(opts.from, 1)[0]);

      for (let i = 0; i < this.entries.length; i++) {
        if (this.entries[i].index !== i) {
          this.entries[i].index = i;
        }
      }
    },
    pinEntry(entry: OTPEntryInterface) {
      this.entries[entry.index].pinned = !entry.pinned;
    },
    updateExport(exportData: { [k: string]: OTPEntryInterface }) {
      this.exportData = exportData;
    },
    updateEncExport(data: {
      entries: { [k: string]: OTPEntryInterface };
      keys: Key[] | OldKey;
    }) {
      if (isOldKey(data.keys)) {
        return;
      }

      const keys = data.keys.reduce((prev: { [id: string]: Key }, key) => {
        prev[key.id] = key;
        return prev;
      }, {});
      this.exportEncData = { ...data.entries, ...keys };
    },
    setWrongPassword() {
      this.wrongPassword = true;
    },
    setInitComplete() {
      this.initComplete = true;
    },
    async deleteCode(hash: string) {
      const index = this.entries.findIndex((entry) => entry.hash === hash);
      if (index > -1) {
        this.entries.splice(index, 1);
      }
      this.updateExport(await EntryStorage.getExport(this.entries));
      this.updateEncExport({
        entries: await EntryStorage.getExport(this.entries, true),
        keys: await BrowserStorage.getKeys(),
      });
    },
    async addCode(entry: OTPEntryInterface) {
      this.entries.unshift(entry);
      this.updateExport(await EntryStorage.getExport(this.entries));
      this.updateEncExport({
        entries: await EntryStorage.getExport(this.entries, true),
        keys: await BrowserStorage.getKeys(),
      });
    },
    async applyPassphrase(password: string) {
      if (!password) {
        return;
      }

      const currentViewStore = useCurrentViewStore();
      const styleStore = useStyleStore();

      currentViewStore.changeView("LoadingPage");

      // Decrypt entries
      let saltedHash = "";
      let migrationNeeded = false;
      const encKeys = await BrowserStorage.getKeys();
      if (isOldKey(encKeys)) {
        // --- handle v2 encryption
        // decrypt using key
        const key = CryptoJS.AES.decrypt(encKeys.enc, password).toString();
        const isCorrectPassword = await new Promise(
          (resolve: (value: string) => void) => {
            const iframe = document.getElementById("argon-sandbox");
            const message = {
              action: "verify",
              value: key,
              hash: encKeys.hash,
            };
            if (iframe) {
              window.addEventListener("message", (response) => {
                resolve(response.data.response);
              });
              // @ts-expect-error - bad typings
              iframe.contentWindow.postMessage(message, "*");
            }
          },
        );

        if (!isCorrectPassword) {
          this.setWrongPassword();
          currentViewStore.changeView("EnterPasswordPage");
          return;
        }

        this.encryption.set(
          LegacyEncryption,
          new Encryption(key, LegacyEncryption),
        );

        migrationNeeded = true;
      } else if (encKeys.length === 0) {
        // --- handle v1 encryption
        // verify current password
        this.encryption.set(
          LegacyEncryption,
          new Encryption(password, LegacyEncryption),
        );
        await this.updateEntries();

        if (this.currentlyEncrypted) {
          this.setWrongPassword();
          currentViewStore.changeView("EnterPasswordPage");
          return;
        }

        migrationNeeded = true;
      } else {
        // --- handle v3 encryption
        // TODO: let user reconcile multiple keys from sync conflicts
        for (const key of encKeys) {
          const rawHash = await new Promise(
            (resolve: (value: string) => void) => {
              const iframe = document.getElementById("argon-sandbox");
              const message = {
                action: "hash",
                value: password,
                salt: key.salt,
              };
              if (iframe) {
                window.addEventListener("message", (response) => {
                  resolve(response.data.response);
                });
                // @ts-expect-error bad typings
                iframe.contentWindow.postMessage(message, "*");
              }
            },
          );

          // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
          const possibleHash = rawHash.split("$")[5];
          if (!possibleHash) {
            throw new Error("argon2 did not return a hash!");
          }

          // verify user password by comparing their password hash with the
          // hash of their password's hash
          const isCorrectPassword = await new Promise(
            (resolve: (value: string) => void) => {
              const iframe = document.getElementById("argon-sandbox");
              const message = {
                action: "verify",
                value: possibleHash,
                hash: key.hash,
              };
              if (iframe) {
                window.addEventListener("message", (response) => {
                  resolve(response.data.response);
                });
                // @ts-expect-error bad typings
                iframe.contentWindow.postMessage(message, "*");
              }
            },
          );

          // TODO: there is a serious bug here. If two keys have the same password,
          // then only one of them will be used for decryption.
          if (isCorrectPassword) {
            this.encryption.set(key.id, new Encryption(possibleHash, key.id));
            this.defaultEncryption = key.id;

            saltedHash = possibleHash;
          }
        }

        await this.updateEntries();

        if (!saltedHash) {
          this.setWrongPassword();
          currentViewStore.changeView("EnterPasswordPage");
          return;
        }
      }

      // Migrate from older encryption if needed
      if (migrationNeeded) {
        // gen hashes

        // The hash of the user's password is used as the encryption key for user data.
        const rawSaltedHash = await genHash(password);
        // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
        const salt = window.atob(rawSaltedHash.split("$")[4]);
        saltedHash = rawSaltedHash.split("$")[5];

        // This hash is used to verify that a user decrypted `saltedHash` correctly
        const hashOfHash = await genHash(saltedHash);

        if (!saltedHash || !hashOfHash) {
          throw new Error("argon2 did not return a hash!");
        }

        // update entry encryption
        const key: Key = {
          dataType: DataType.Key,
          id: crypto.randomUUID(),
          salt: salt,
          hash: hashOfHash,
          version: 3,
        };
        const newEncryption = new Encryption(saltedHash, key.id);
        this.encryption.set(key.id, newEncryption);
        this.defaultEncryption = key.id;

        const toRemove: string[] = [];
        for (const entry of this.entries) {
          if (!entry.secret) {
            continue;
          }

          await entry.changeEncryption(newEncryption);

          // if not uuidv4 regen
          if (
            /[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/i.test(
              entry.hash,
            )
          ) {
            entry.genUUID();
            toRemove.push(entry.hash);
          }
        }

        // store key
        await BrowserStorage.set({
          [key.id]: key,
        });
        await EntryStorage.set(this.entries);
        await BrowserStorage.remove(toRemove);
        await BrowserStorage.remove("key");

        await this.updateEntries();
      }

      if (!saltedHash) {
        throw new Error("Empty saltedHash! This should never happen.");
      }

      // Encrypt any unencrypted entries.
      // Browser sync can cause unencrypted entries to show up.
      let needUpdateStorage = false;
      const defaultEnc = this.encryption.get(this.defaultEncryption);
      if (!defaultEnc) {
        throw new Error(
          "defaultEncryption is empty, this should never happen!",
        );
      }
      for (const entry of this.entries) {
        if (entry.encryption?.getEncryptionKeyId() !== this.defaultEncryption) {
          await entry.changeEncryption(defaultEnc);
          needUpdateStorage = true;
        }
      }

      if (needUpdateStorage) {
        await EntryStorage.set(this.entries);
        await this.updateEntries();
      }

      if (!this.currentlyEncrypted) {
        chrome.runtime.sendMessage({
          action: "cachePassphrase",
          value: saltedHash,
          keyId: defaultEnc.getEncryptionKeyId(),
        });
      }

      styleStore.hideInfo(true);
      return;
    },
    async changePassphrase(password: string) {
      if (password) {
        // The hash of the user's password is used as the encryption key for user data.
        const rawSaltedHash = await genHash(password);
        // https://passlib.readthedocs.io/en/stable/lib/passlib.hash.argon2.html#format-algorithm
        const salt = window.atob(rawSaltedHash.split("$")[4]);
        const saltedHash = rawSaltedHash.split("$")[5];

        // This hash is used to verify that a user decrypted `saltedHash` correctly
        const hashOfHash = await genHash(saltedHash);

        if (!saltedHash || !hashOfHash) {
          throw new Error("argon2 did not return a hash!");
        }

        // change entry encryption and regen hash
        const removeKeys: string[] = [];
        const keys = await BrowserStorage.getKeys();
        if (isOldKey(keys)) {
          throw new Error("OldKey still being used. This should never happen!");
        }
        const key: Key = {
          dataType: DataType.Key,
          id: crypto.randomUUID(),
          salt: salt,
          hash: hashOfHash,
          version: 3,
        };

        const linkedKeys = new Map<string, undefined>();
        for (const entry of this.entries) {
          await entry.changeEncryption(new Encryption(saltedHash, key.id));
          // if not uuidv4 regen
          if (
            /[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/i.test(
              entry.hash,
            )
          ) {
            removeKeys.push(entry.hash);
            entry.genUUID();
          }

          if (entry.encryption?.getEncryptionKeyId()) {
            linkedKeys.set(entry.encryption.getEncryptionKeyId(), undefined);
          }
        }

        // store key
        await BrowserStorage.set({
          [key.id]: key,
        });
        await EntryStorage.set(this.entries);
        // remove unlinked keys when there is at least one entry
        if (this.entries.length !== 0) {
          for (const storedKey of keys) {
            if (!linkedKeys.has(storedKey.id)) {
              removeKeys.push(storedKey.id);
            }
          }
        }
        if (removeKeys.length) {
          await BrowserStorage.remove(removeKeys);
        }

        this.encryption.set(key.id, new Encryption(saltedHash, key.id));
        this.defaultEncryption = key.id;

        await this.updateEntries();

        // https://github.com/Authenticator-Extension/Authenticator/issues/412
        if (isChromium) {
          await BrowserStorage.clearLogs();
        }

        chrome.runtime.sendMessage({
          action: "cachePassphrase",
          value: saltedHash,
          keyId: key.id,
        });
      } else {
        for (const entry of this.entries) {
          await entry.changeEncryption(new Encryption("", ""));
        }
        await EntryStorage.set(this.entries);

        await BrowserStorage.remove("key");
        const keyId = this.encryption
          .get(this.defaultEncryption)
          ?.getEncryptionKeyId();
        if (keyId) {
          await BrowserStorage.remove(keyId);
        }
        this.defaultEncryption = "";

        await this.updateEntries();

        chrome.runtime.sendMessage({
          action: "lock",
        });
      }

      // remove cached passphrase in old version
      UserSettings.items.encodedPhrase = undefined;
      await UserSettings.removeItem("encodedPhrase");
    },
    async updateEntries() {
      const entries = await getEntries();

      for (const entry of entries) {
        // LegacyEncryption indicates that we need to use backwards compatibility logic
        if (entry.encSecret) {
          const legacyEnc = this.encryption.get(LegacyEncryption);
          if (legacyEnc) {
            await entry.applyEncryption(legacyEnc);
          }
        } else if (entry.keyId) {
          const entryEncryption = this.encryption.get(entry.keyId);
          if (entryEncryption) {
            await entry.applyEncryption(entryEncryption);
          }
        }
      }

      this.loadCodes(entries);
      this.updateCodes();
      this.updateExport(await EntryStorage.getExport(this.entries));
      this.updateEncExport({
        entries: await EntryStorage.getExport(this.entries, true),
        keys: await BrowserStorage.getKeys(),
      });
      this.setInitComplete();
      return;
    },
    clearFilter() {
      this.stopFilter();
      if (this.entries.length >= 10) {
        this.showSearchBar();
      }
    },
    async migrateStorage(newStorageLocation: string) {
      // sync => local
      if (
        UserSettings.items.storageLocation === StorageLocation.Sync &&
        newStorageLocation === StorageLocation.Local
      ) {
        const syncData = await chrome.storage.sync.get();
        await chrome.storage.local.set(syncData); // userSettings will be handled later
        const localData = await chrome.storage.local.get();

        // Double check if data was set
        if (
          Object.keys(syncData).every(
            (value) => Object.keys(localData).indexOf(value) >= 0,
          )
        ) {
          UserSettings.items.storageLocation = StorageLocation.Local;
          await chrome.storage.sync.clear();
          await chrome.storage.local.set({
            UserSettings: UserSettings.items,
          });
          return "updateSuccess";
        } else {
          throw " All data not transferred successfully.";
        }
        // local => sync
      } else if (
        UserSettings.items.storageLocation === StorageLocation.Local &&
        newStorageLocation === StorageLocation.Sync
      ) {
        const localData = await chrome.storage.local.get();
        if (localData?.UserSettings) {
          delete localData.UserSettings;
          await chrome.storage.sync.set(localData);
        }
        const syncData = await chrome.storage.sync.get();

        // Double check if data was set
        if (
          Object.keys(localData).every(
            (value) => Object.keys(syncData).indexOf(value) >= 0,
          )
        ) {
          UserSettings.items.storageLocation = StorageLocation.Sync;
          await chrome.storage.local.clear();
          await UserSettings.commitItems();
          return "updateSuccess";
        } else {
          throw " All data not transferred successfully.";
        }
      }

      // No change
      return "updateSuccess";
    },
  },
});
