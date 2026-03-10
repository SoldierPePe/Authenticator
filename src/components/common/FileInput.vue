<template>
  <div class="import_file">
    <label for="import_file">{{ label }}</label>
    <input
      id="import_file"
      type="file"
      v-bind="$attrs"
      :accept="accept"
      :multiple="multiple"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
defineProps<{ label?: string; multiple?: boolean; accept?: string }>();
</script>
