import { api } from "./api";

export interface LiveSlides {
    active: boolean;
}

export const updateLiveSlides = (livepresentation: Partial<LiveSlides>) => api.patch("/livepresentation/", livepresentation);

export const stopLiveSlides = async () => {
    try {
        await updateLiveSlides({ active: false });
        //console.log("Live slides stoped.");
    } catch (error) {
        console.error("Error stopping live slides:", error);
    }
}

export const startLiveSlides = async () => {
    try {
        await updateLiveSlides({ active: true });
        //console.log("Live slides started.");
    } catch (error) {
        console.error("Error starting live slides:", error);
    }
}