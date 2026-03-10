<template>
  <div id="permissions" class="theme-normal">
    <h1>Permissions</h1>
    <div>
      <input
        type="checkbox"
        id="showRequiredPermission"
        v-model="showAllPermissions"
      />
      <label for="showRequiredPermission">{{
        i18n.permission_show_required_permissions
      }}</label>
    </div>
    <div v-for="permission in permissions" :key="permission.id">
      <h2>{{ permission.id }}</h2>
      <p>{{ permission.description }}</p>
      <p v-if="!permission.revocable">{{ i18n.permission_required }}</p>
      <button
        :disabled="!permission.revocable"
        v-if="permission.revocable"
        v-on:click="revoke(permission.id)"
      >
        {{ i18n.permission_revoke }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
import { usePermissionsStore } from "../store/Permissions";
import { Permission } from "../models/permission";

const permissionsStore = usePermissionsStore();

const showAllPermissions = ref(false);

const permissions = computed(() => {
  return permissionsStore.permissions.filter((permission: Permission) => {
    return showAllPermissions.value || permission.revocable;
  });
});

function revoke(permissionId: string) {
  permissionsStore.revokePermission(permissionId);
}
</script>
