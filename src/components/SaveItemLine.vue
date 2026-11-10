<script setup lang="ts" generic="Item extends ItemInterface">
// Vue-stuff
import { computed, type Ref } from 'vue';
import Button from 'primevue/button'
import InputText from 'primevue/inputtext';
import FloatLabel from 'primevue/floatlabel';
// globals and services
import '@/assets/main.css'
import { type ItemInterface } from '@/generics/interfaceItem'


const nameTaken = computed(() => {
    const name = inpItemname.value.trim()
    if (!name) return false
    return props.all_items.value.some(item => item.name === name)
})

// Define Input Proerties
const props = defineProps<{
    all_items: Ref<Item[]>;
    name_edit_enabled: boolean;
    placeholder: string;
    already_taken_message: string;
}>()

const inpItemname = defineModel<string>('inp_itemname', { required: true })

const emit = defineEmits<{ save: [] }>()

function onClickSave() {
    emit('save')
}
</script>

<template>
    <div>
        <Fluid style="display: flex; gap: 0.5rem; width: 100%;">
            <FloatLabel variant="on" style="flex-grow: 1;">
                <InputText id="itemname_input" v-model="inpItemname" :placeholder="props.placeholder"
                    style="width: 100%;" />
                <label v-if="nameTaken" for="itemname_input">{{ props.already_taken_message }}</label>
            </FloatLabel>

            <Button :label="$t('moderator.save')" icon="pi pi-save" :disabled="!inpItemname.trim()" style="flex-shrink: 0;"
                @click="onClickSave" />
        </Fluid>
    </div>
</template>

<style scoped></style>