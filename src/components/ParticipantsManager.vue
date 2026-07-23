<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import Button from 'primevue/button';
import Select from 'primevue/select';
import "@/assets/main.css";
import type { Participant } from "@/services/participant_service";
import { ref, watch, computed } from 'vue';
import { Style, Avatar } from '@dicebear/core';

import glyphs from '@dicebear/styles/glyphs.json' with { type: 'json' };
import icons from '@dicebear/styles/icons.json' with { type: 'json' };
import shapes from '@dicebear/styles/shapes.json' with { type: 'json' };
import initials from '@dicebear/styles/initials.json' with { type: 'json' };
import identicon from '@dicebear/styles/identicon.json' with { type: 'json' };
import pixelArt from '@dicebear/styles/pixel-art.json' with { type: 'json' };
import notionists from '@dicebear/styles/notionists.json' with { type: 'json' };

type DraftParticipant = Participant & { isNew?: boolean };

const props = defineProps<{
  participants: Participant[];
}>();

const emit = defineEmits<{
  'update-participant': [participant: Participant];
  'create-participant': [participant: Participant];
}>();

/* ---------- rows ---------- */

const rows = ref<DraftParticipant[]>([...props.participants]);
watch(() => props.participants, v => { rows.value = [...v]; }, { deep: false });

const editingRows = ref<DraftParticipant[]>([]);

/* ---------- avatar styles ---------- */

const styleDefs = {
  glyphs, icons, shapes, initials, identicon,
  'pixel-art': pixelArt,
  notionists,
} as const;

type StyleName = keyof typeof styleDefs;

const styleNames = Object.keys(styleDefs) as StyleName[];
const selectedStyle = ref<StyleName>('glyphs');
const avatarStyle = computed(() => new Style(styleDefs[selectedStyle.value]));

function avatarUri(seed: string) {
  const s = (seed ?? '').toLowerCase().trim().replace(/\s+/g, '') || 'preview';
  return new Avatar(avatarStyle.value, { seed: s, size: 88 }).toDataUri();
}

const previewCache = new Map<StyleName, string>();
function previewUri(name: StyleName) {
  if (!previewCache.has(name)) {
    previewCache.set(
      name,
      new Avatar(new Style(styleDefs[name]), { seed: 'preview', size: 32 }).toDataUri()
    );
  }
  return previewCache.get(name)!;
}

function prettyName(name: string) {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ---------- seats ---------- */

const takenSeats = computed(
  () => new Set(rows.value.map(p => p.seat).filter((s): s is number => s != null))
);

function seatOptions(current: number | null) {
  const taken = new Set(takenSeats.value);
  if (current != null) taken.delete(current);
  return Array.from({ length: 99 }, (_, i) => i + 1).filter(s => !taken.has(s));
}

/* ---------- persistence ---------- */

function persist(row: DraftParticipant) {
  const { isNew, ...data } = row;
  emit(isNew ? 'create-participant' : 'update-participant', data as Participant);
}

function onRowEditSave(event: { newData: DraftParticipant; index: number }) {
  rows.value[event.index] = event.newData;
  persist(event.newData);
}

function onRowEditCancel(event: { data: DraftParticipant; index: number }) {
  if (event.data.isNew) rows.value.splice(event.index, 1);
}

function onAddParticipant() {
  const draft: DraftParticipant = {
    id: `new-${Date.now()}` as unknown as Participant['id'],
    name: '',
    seat: seatOptions(null)[0] ?? null,
    interactions: false,
    isNew: true,
  };
  rows.value.push(draft);
  editingRows.value = [...editingRows.value, draft];
}
</script>

<template>
  <div class="dashboard participants-container">

    <div class="toolbar">
      <h1 class="dashboard_label">Participants</h1>

      <div class="toolbar-actions">
        <Select v-model="selectedStyle" :options="styleNames" placeholder="Avatar Style" class="style-select">
          <template #option="{ option }">
            <div class="style-option">
              <img :src="previewUri(option)" width="28" height="28" />
              <span>{{ prettyName(option) }}</span>
            </div>
          </template>
          <template #value="{ value, placeholder }">
            <div class="style-option" v-if="value">
              <img :src="previewUri(value)" width="24" height="24" />
              <span>{{ prettyName(value) }}</span>
            </div>
            <span v-else>{{ placeholder }}</span>
          </template>
        </Select>

        <Button label="Add Participant" @click="onAddParticipant">
          <template #icon>
            <i class="material-symbols-outlined">add</i>
          </template>
        </Button>
      </div>
    </div>

    <DataTable :value="rows" v-model:editingRows="editingRows" editMode="row" dataKey="id" :scrollable="true"
      scrollHeight="flex" tableLayout="fixed" @row-edit-save="onRowEditSave" @row-edit-cancel="onRowEditCancel"
      :rowClass="(data: DraftParticipant) => (data.seat == null ? 'row-unseated' : '')" class="participants-table">

      <Column field="seat" header="Seat" style="width: 120px">
        <template #body="{ data }">
          <Select v-model="data.seat" :options="seatOptions(data.seat)" :show-clear="true" class="seat-select"
            @change="persist(data)">
            <template #value="{ value }">
              <span v-if="value" class="seat">{{ value }}</span>
              <span v-else>
                <i style="color: var(--p-primary-500);" class="material-symbols-outlined">remove</i>
              </span>
            </template>
          </Select>
        </template>
        <template #editor="{ data }">
          <Select v-model="data.seat" :options="seatOptions(data.seat)" :show-clear="true" placeholder="Assign"
            class="seat-select" />
        </template>
      </Column>

      <Column header="" style="width: 72px" bodyStyle="text-align: center">
        <template #body="{ data }">
          <img :src="avatarUri(data.name)" width="44" height="44"
            :class="['avatar', data.seat == null ? 'avatar-unseated' : 'avatar-seated']" />
        </template>
      </Column>

      <Column field="name" header="Name">
        <template #body="{ data }">
          <span class="participant-name">{{ data.name }}</span>
        </template>
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" fluid autofocus />
        </template>
      </Column>

      <Column header="Interactions" style="width: 120px" bodyStyle="text-align: center"
        headerStyle="text-align: center">
        <template #body="{ data }">
          <ToggleSwitch v-model="data.interactions" @change="persist(data)" />
        </template>
      </Column>



      <Column :rowEditor="true" style="width: 56px" bodyStyle="text-align: center" />

    </DataTable>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-medium);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-medium);
}

.participants-container {
  display: grid;
  grid-template-rows: auto 1fr;
  aspect-ratio: var(--grid-aspect);
  width: 100%;
  height: auto;
  max-height: 100%;
  min-height: 0;
  margin: auto;
  gap: var(--space-medium);
  padding: var(--space-medium);
  border-radius: var(--br-medium);
  overflow: hidden;
}

.participants-table {
  min-height: 0;
}

.style-option {
  display: flex;
  align-items: center;
  gap: var(--space-small);
}

.style-option img {
  border-radius: 4px;
  flex-shrink: 0;
}

.avatar {
  border-radius: 50%;
  background: var(--p-surface-100);
  box-shadow: 0 0 0 2px var(--p-surface-200);
  display: block;
}

.avatar-unseated {
  opacity: 0.5;
}

.seat-select {
  width: 100%;
  text-align: center;
  outline: none;
  border: none;
  box-shadow: none;
  background: transparent;
}

.seat {
  font-weight: bold;
  color: var(--p-primary-500);
  font-size: var(--fs-large);
  font-family: "Firacode", monospace;
}

.participant-name {
  color: var(--p-primary-500);
  font-weight: bold;
}

:deep(.p-datatable-thead > tr > th) {
  background: var(--p-primary-500);
  color: white;
  font-size: var(--fs-medium);
  font-weight: bold;
}

:deep(.p-datatable-tbody > tr:hover) {
  background: var(--p-surface-100);
}

:deep(.p-datatable-thead > tr > th:first-child) {
  border-top-left-radius: var(--br-medium);
  border-bottom-left-radius: var(--br-medium);
}

:deep(.p-datatable-thead > tr > th:last-child) {
  border-top-right-radius: var(--br-medium);
  border-bottom-right-radius: var(--br-medium);
}

:deep(.p-datatable-table-container) {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--p-primary-300) transparent;
}

:deep(.row-unseated) {
  border-left: 4px solid var(--p-primary-500);
}

:deep(.row-unseated .participant-name) {
  opacity: 0.5;
}
</style>