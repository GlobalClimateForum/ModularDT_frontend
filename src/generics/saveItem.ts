import { useToast } from 'primevue/usetoast';
import { type ItemInterface } from '@/generics/interfaceItem'

type SaveFunction<I, A extends unknown[] = []> = (item: I, ...args: A) => Promise<{ id: number }>;

export function useItemSave() {
    const toast = useToast();

    async function onSaveItem<T extends ItemInterface, A extends unknown[]>(
        itemTypeString: string,
        saveFunction: SaveFunction<T, A>,
        item: T,
        ...args: A
    ): Promise<number | undefined> {
        try {
            const response = await saveFunction(item, ...args);
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: `${itemTypeString} saved successfully`,
                life: 3000
            });
            return response.id;
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: `Failed to save ${itemTypeString}`,
                life: 3000
            });
            console.error(`Error saving ${itemTypeString}:`, error);
            return undefined;
        }


    }
    return { onSaveItem };
}
