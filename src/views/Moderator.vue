<script setup lang="ts">
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { PrimeIcons } from '@primevue/core/api';


const items = [
    {
        label: 'Slides',
        items: [
            { label: 'New', icon: PrimeIcons.PLUS },
        ]
    },
    {
        label: 'Edit',
        items: [
                { label: 'Undo', icon: PrimeIcons.UNDO }
        ]
    }
];
</script>

<template>

    <Toolbar class="toolbar"">
        
        <template #start>
            <h3>Moderator View</h3>
        </template>

<template #end>
            <div class=" flex items-center gap-2">
        <Button label="Share" size="small" />
        </div>
</template>
</Toolbar>

<Splitter class="moderator-view">
    <SplitterPanel class="flex items-center justify-center" :size="10" :minSize="10">
        <Menu :model="items" />
    </SplitterPanel>
    <SplitterPanel class="flex items-center justify-center" :size="90"> Panel 2 </SplitterPanel>
</Splitter>


</template>

<style scoped>
.toolbar {
    margin: 1rem;
    height: 5rem;
    border-radius: 2.5rem;
    padding: 0 2rem;
    color: var(--color-primary);
}

.moderator-view {
    height: 80vh;
    margin: 1rem;
    overflow: hidden;
}
</style>