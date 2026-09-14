<script setup lang="ts">
import { ref } from 'vue';
import InputText from "primevue/inputtext"
import DatePicker from "primevue/datepicker"
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import '@/assets/main.css';
import { type Event, saveEvent } from '@/services/event_service';
import { useToast } from 'primevue/usetoast';
import { inject } from 'vue';

const dialogRef = inject('dialogRef') as any;
const toast = useToast();
const newEvent = ref<Event>({ id: null, name: '', description: '', date: null });

function onAddEvent() {
    if (!newEvent.value.name) {
        toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Event name is required.', life: 3000 });
        return;
    }
    saveEvent(newEvent.value).then(() => {
        newEvent.value = { id: null, name: '', description: '', date: null };
        dialogRef.value.close();   // close on success
        toast.add({ severity: 'success', summary: 'Success', detail: 'Event added successfully!', life: 3000 });
    }).catch((error) => {
        console.error('Error adding event:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add event.', life: 3000 });
    });
}


</script>


<template>
    <form @submit.prevent="onAddEvent" class="add-event-container">
        <div class="label-container">
            <label for="event_name">Event Name</label>
            <InputText fluid id="event_name" v-model="newEvent.name" />
        </div>

        <div class="label-container">
            <label for="event_description">Event Description</label>
            <Textarea fluid id="event_description" v-model="newEvent.description" rows="10" />
        </div>

        <div class="label-container">
            <label for="event_date">Event Date</label>
            <DatePicker style="width: 100%" id="event_date" v-model="newEvent.date" />
        </div>

        <Button label="Add Event" @click="onAddEvent" :disabled="!newEvent.name">
            <template #icon>
                <i class="material-symbols-outlined">add</i>
            </template>
        </Button>
    </form>
</template>

<style scoped>
.add-event-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-medium);
}
</style>