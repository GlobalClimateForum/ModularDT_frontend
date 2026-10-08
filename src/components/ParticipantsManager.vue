<script setup lang="ts">
// Vue-stuff
import { ref, watch, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';
// globals and services
import "@/assets/main.css";
import { type Participant, updateParticipant, createParticipant, deleteParticipant } from "@/services/participant_service";
import { type StyleName, styleNames, makeStyle, avatarUri as buildAvatarUri, previewUri, prettyName, changeAvatarStyleSetting } from '@/services/avatar_service';
import { participants, fetchParticipants } from '@/globals/participants';

const toast = useToast();

type DraftParticipant = Participant & { isNew?: boolean };


/* ??
const props = defineProps<{
  participants: Participant[];
}>();
*/
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

/* ---------- rows ---------- */
const rows = ref<DraftParticipant[]>([...participants.value]);
watch(() => participants.value, v => { rows.value = [...v]; }, { deep: false });

const editingRows = ref<DraftParticipant[]>([]);

/* ---------- avatar styles ---------- */
const selectedStyle = ref<StyleName>('glyphs');
const avatarStyle = computed(() => makeStyle(selectedStyle.value));

function avatarUri(seed: string) {
  return buildAvatarUri(avatarStyle.value, seed);
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

// Persist a participant row to the backend, either creating or updating as necessary.
function persist(row: DraftParticipant) {
  const { isNew, ...data } = row;
  if (isNew) {
    return createParticipant(data as Participant).then(p => {
      Object.assign(row, p);
      delete row.isNew;
    });
  } else {
    return updateParticipant(data as Participant);
  }
}

function onRowEditSave(event: { newData: DraftParticipant; index: number }) {
  rows.value[event.index] = event.newData;
  persist(event.newData);
}

function onRowEditCancel(event: { data: DraftParticipant; index: number }) {
  if (event.data.isNew) rows.value.splice(event.index, 1);
}

function onRowEditDelete(event: { data: DraftParticipant; index: number }) {
  const row = event.data;
  if (row.isNew) {
    rows.value = rows.value.filter(r => r !== row);
    return;
  }
  if (row.id) {
    deleteParticipant(row.id).then(() => {
      rows.value = rows.value.filter(r => r.id !== row.id);
      fetchParticipants();
      toast.add({
        severity: 'success',
        summary: 'Participant deleted',
        detail: `Participant ${row.name} has been deleted.`,
      });
    });
    fetchParticipants(); // Refresh the participants list after deletion
  }
}

function onAddParticipant() {
  const draft: DraftParticipant = {
    id: `new-${Date.now()}` as unknown as Participant['id'],
    name: '',
    seat: seatOptions(null)[0] ?? null,
    interactions: false,
    isNew: true,
  };
  rows.value = [draft, ...rows.value];
  editingRows.value = [...editingRows.value, draft];
}

function onClearSeats() {
  rows.value.forEach(p => p.seat = null);
  Promise.all(rows.value.map(persist)).then(fetchParticipants);
}

function onHandsOff() {
  rows.value.forEach(p => p.interactions = false);
  Promise.all(rows.value.map(persist)).then(fetchParticipants);
}
</script>

<template>
  <div class="participant-manager">
    <div class="dashboard-header">
      
      <InputText style="width: 400px" v-model="filters.global.value" placeholder="Search participant ..."></InputText>
      
      <div class="participant-actions">
        <Select v-model="selectedStyle" :options="styleNames" placeholder="Avatar Style" class="style-select"
          @change="changeAvatarStyleSetting(selectedStyle)">
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

        <Button  @click="onHandsOff">
          <template #icon>
            <i class="material-symbols-outlined">do_not_touch</i>
          </template>
        </Button>

        <Button  @click="onClearSeats">
          <template #icon>
            <i class="material-symbols-outlined">chair</i>
          </template>
        </Button>

        <Button label="Add" @click="onAddParticipant">
          <template #icon>
            <i class="material-symbols-outlined">add</i>
          </template>
        </Button>

      </div>
    </div>

    <Splitter class="dashboard">
      <SplitterPanel class="participants-container">

        <DataTable :value="rows" v-model:editingRows="editingRows" editMode="row" dataKey="id" scrollHeight="flex"
          tableLayout="fixed" @row-edit-save="onRowEditSave" @row-edit-cancel="onRowEditCancel"
          :rowClass="(data: DraftParticipant) => (data.seat == null ? 'row-unseated' : '')" class="participants-table"
          :filters="filters" filterDisplay="menu" :globalFilterFields="['name', 'seat']"
          :filterOperator="FilterOperator.OR" scrollable>

          <Column field="seat" header="Seat" style="width: 150px" sortable>
            <template #body="{ data }">
              <Select v-model="data.seat" :options="seatOptions(data.seat)" :show-clear="true" class="seat-select"
                @change="persist(data).then(fetchParticipants)">
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

          <Column field="name" header="Name" sortable>
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

          <Column :rowEditor="true" style="width: 110px;" bodyStyle="text-align: center">
            <template #body="{ data, rowIndex, editorInitCallback }">
              <div class="interactions">
                <Button text rounded @click="editorInitCallback($event)">
                  <template #icon><i class="material-symbols-outlined">edit</i></template>
                </Button>
                <Button text rounded @click="onRowEditDelete({ data, index: rowIndex })">
                  <template #icon><i class="material-symbols-outlined">delete</i></template>
                </Button>
              </div>
            </template>
            <template #editor="{ editorSaveCallback, editorCancelCallback }">
              <div class="interactions">
                <Button text rounded @click="editorSaveCallback($event)">
                  <template #icon><i class="material-symbols-outlined">check</i></template>
                </Button>
                <Button text rounded @click="editorCancelCallback($event)">
                  <template #icon><i class="material-symbols-outlined">close</i></template>
                </Button>
              </div>
            </template>
          </Column>
        </DataTable>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<style scoped>
.participant-manager {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.dashboard {
    flex: 1;
    min-height: 0;
}

.participants-container {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  aspect-ratio: var(--grid-aspect);
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  margin: auto;
  gap: var(--space-medium);
  padding: var(--space-medium);
  border-radius: var(--br-medium);
}

.participant-actions{
  display: flex;
  align-items: center;
  gap: var(--space-small);
  margin-left: auto;
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

.interactions {
  display: flex;
  justify-content: center;
  gap: var(--space-small);
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

:deep(.p-datatable-thead > tr > th:hover) {
  background: var(--p-primary-500);
  color: white;
}

:deep(.p-datatable-sort-icon) {
  filter: brightness(0) invert(1);
}

:deep(.row-unseated) {
  border-left: 4px solid var(--p-primary-500);
}

:deep(.row-unseated .participant-name) {
  opacity: 0.5;
}
</style>