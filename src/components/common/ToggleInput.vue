<template>
  <div class="control-group">
    <label class="combo-label">{{ label }}</label>
    <input
      class="checkbox"
      type="checkbox"
      :checked="modelValue"
      @change="
        $emit('update:modelValue', ($event.target as HTMLInputElement).checked)
      "
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label?: string; modelValue?: boolean }>();
defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>
