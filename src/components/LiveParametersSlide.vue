<script lang="ts" setup>
import type { Slide, SlideSection } from '@/services/slide_service';
import SlideView from '@/components/SlideView.vue';

const props = withDefaults(defineProps<{
    slide: Slide | null,
    sections: SlideSection[],
    monitor_id: Number
}>(), {
    sections: () => [],
})
</script>

<template>
    <div v-if="props.slide != null" class="presentation_container">
        <SlideView :preview="false" :slide="props.slide" :sections="props.sections">
        </SlideView>
    </div>
    <div v-else class="panel-content centred_text">
        {{ $t('moderator.no_parameters_for_monitor') }} {{ props.monitor_id }}
    </div>
</template>


<style scoped>
.presentation_container {
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: var(--br-medium);
  padding: var(--space-large);
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.centred_text {
  text-align: center;
  position: relative;
  top: 50%;
  -ms-transform: translateY(-50%);
  -webkit-transform: translateY(-50%);
  transform: translateY(-50%);
  font-size:   200%;
}
</style>