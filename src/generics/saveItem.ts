import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { type ItemInterface } from '@/generics/interfaceItem'

type SaveFunction = (id: number) => Promise<unknown>;

export function useItemSave() {
    const { t } = useI18n();
    const confirm = useConfirm();
    const toast = useToast();

    async function onSaveItem<T extends ItemInterface>(
        item: T,
        itemTypeString: string,
        saveFunction: SaveFunction,
        ...args : any[]
    ): Promise<boolean> {
        if (!Number.isFinite(item.id)) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: `${itemTypeString} ID is missing`,
                life: 3000
            });
            console.error(`Error saveing ${itemTypeString}: no valid ID`);
            return false;
        }

        if (item.id) {
            try {
                await saveFunction(item.id);
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `${itemTypeString} saved successfully`,
                    life: 3000
                });
            } catch (error) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `Failed to save ${itemTypeString}`,
                    life: 3000
                });
                console.error(`Error saving ${itemTypeString}:`, error);
                return false
            }
            return true
        } else {
            return false
        }
    }

    return { onSaveItem };
}