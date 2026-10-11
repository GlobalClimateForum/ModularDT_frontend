import { useConfirm } from 'primevue/useconfirm';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';

export interface ItemInterface {
    id: number;
    name: string;
}

type DeleteFunction = (id: number) => Promise<unknown>;

export function useItemDeletion() {
    const { t } = useI18n();
    const confirm = useConfirm();
    const toast = useToast();

    async function onDeleteItem<T extends ItemInterface>(
        item: T,
        itemTypeString: string,
        deleteFunction: DeleteFunction
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

        try {
            await deleteFunction(item.id);
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: `${itemTypeString} deleted successfully`,
                life: 3000
            });
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: `Failed to delete ${itemTypeString}`,
                life: 3000
            });
            console.error(`Error deleting ${itemTypeString}:`, error);
            return false
        }
        return true
    }

    function onConfirmDeleteItem<T extends ItemInterface>(
        item: T,
        itemTypeString: string,
        deleteFunction: DeleteFunction
    ): Promise<boolean> {
        return new Promise((resolve) => {
            confirm.require({
                header: t('moderator.confirmation'),
                message: t('moderator.confirmation-message-head') + t('moderator.' + itemTypeString) + " (" + item.name + ")" + t('moderator.confirmation-message-tail'),
                acceptLabel: t('moderator.confirmation-ok'),
                rejectLabel: t('moderator.confirmation-cancel'),
                accept: async () => {
                    resolve(await onDeleteItem(item, itemTypeString, deleteFunction));
                },
                reject: () => resolve(false)
            });
        });
    }

    return { onConfirmDeleteItem };
}