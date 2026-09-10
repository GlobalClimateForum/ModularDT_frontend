<script lang="ts" setup>
import { inject } from 'vue'

const props = defineProps({
  href: { type: String, required: true }
})


// Injiziere den Handler (kann auch der Default-Handler sein)
const handleClick = inject<(href: string, event: Event) => void>(
  'slideLinkClickHandler',
  (href: string, event: Event) => {
    console.log("default handler für", href);
    event.preventDefault();
  });
</script>

<template>
  <a :href="href" @click="handleClick(href, $event)" v-bind="{ ...$attrs, target: undefined }">
    <slot>Link-Text</slot>
  </a>
</template>

<style scoped>
a {
  cursor: pointer;
  color: #0066cc;
  text-decoration: underline;
}
</style>
