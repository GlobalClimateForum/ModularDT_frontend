import { ref } from 'vue';
import { slides } from '@/globals/slides';
import { getParameters } from "@/services/parameter_service";

export interface SlideParameter {
    id?: number,
    name: string
    type: string
    default: string
    slide_seciton: number
}

export const slideParameters = ref<SlideParameter[]>([]);

export async function fetchSlideParameters() {
    slideParameters.value = [];
    await getParameters().then(response => {
        response.data.forEach((parameter_set) => {
            Object.entries(parameter_set.parameters).forEach(([name, settings]) => {
                const sp: SlideParameter = {
                    id: settings.id,
                    name: name,
                    type: settings.type,
                    default: settings.default,
                    slide_seciton: parameter_set.section_id
                };
                slideParameters.value.push(sp)
            })
        })
    }).catch(error => {
        console.error("Error fetching slide parameters:", error);
    });
}