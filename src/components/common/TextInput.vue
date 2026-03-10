<template>
  <div>
    <label>{{ label }}</label>
    <input
      :type="type ? type : 'text'"
      class="input"
      :value="modelValue"
      @input="
        $emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
      @keyup.enter="$emit('enter')"
      ref="textInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const props = defineProps<{
  label?: string;
  modelValue?: string;
  type?: string;
  autofocus?: boolean;
}>();
defineEmits<{ "update:modelValue": [value: string]; enter: [] }>();

const textInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  if (!props.autofocus) return;
  textInput.value?.focus();
});
</script>
