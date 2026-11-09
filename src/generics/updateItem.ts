import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { type ItemInterface } from '@/generics/interfaceItem'

type UpdateFunction = (id: number, stuff) => Promise<unknown>;

export function useItemUpdate() {
    const { t } = useI18n();
    const confirm = useConfirm();
    const toast = useToast();

    async function onUpdateItem<T extends ItemInterface>(
        itemTypeString: string,
        updateFunction: UpdateFunction,        
        item: T
    ): Promise<boolean> {
        if (!Number.isFinite(item.id)) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: `${itemTypeString} ID is missing`,
                life: 3000
            });
            console.error(`Error deleting ${itemTypeString}: no valid ID`);
            return false;
        }

        if (item.id) {
            try {
                await updateFunction(item.id, item);
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `${itemTypeString} updated successfully`,
                    life: 3000
                });
            } catch (error) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `Failed to update ${itemTypeString}`,
                    life: 3000
                });
                console.error(`Error updating ${itemTypeString}:`, error);
                return false
            }
            return true
        } else {
            return false
        }
    }

    function onConfirmedUpdateItem<T extends ItemInterface>(
        itemTypeString: string,
        updateFunction: UpdateFunction,        
        item: T
    ): Promise<boolean> {
        return new Promise((resolve) => {
            confirm.require({
                header: t('moderator.confirmation'),
                message: t('moderator.confirmation-update-message-head') + t('moderator.' + itemTypeString) + t('moderator.confirmation-update-message-middle')  + item.name + t('moderator.confirmation-update-message-tail'),
                acceptLabel: t('moderator.confirmation-ok'),
                rejectLabel: t('moderator.confirmation-cancel'),
                accept: async () => {
                    resolve(await onUpdateItem(itemTypeString, updateFunction, item));
                },
                reject: () => resolve(false)
            });
        });
    }

    return { onConfirmedUpdateItem };
}