<template>
  <div class="control-group">
    <label class="combo-label" style="margin: 20px 10px">{{ label }}</label>
    <select
      style="margin: 20px 10px"
      :value="modelValue"
      :disabled="disabled"
      @input="
        $emit('update:modelValue', ($event.target as HTMLSelectElement).value)
      "
      @change="$emit('change')"
    >
      <slot></slot>
    </select>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
  modelValue?: string | number;
  disabled?: boolean;
}>();
defineEmits<{ "update:modelValue": [value: string]; change: [] }>();
</script>
