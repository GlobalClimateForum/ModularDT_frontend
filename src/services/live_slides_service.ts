import { api } from "./api";

export interface LiveSlides {
    active: boolean;
}

/*
export const updateLiveSlides = (liveslides: Partial<LiveSlides>) => api.patch("/liveslides/", liveslides);

export function stopLiveSlides() {
    try {
        updateLiveSlides({ active: false });
        //console.log("Live slides stoped.");
    } catch (error) {
        console.error("Error stopping live slides:", error);
    }
}

export function startLiveSlides() {
    try {
        updateLiveSlides({ active: true });
    } catch (error) {
        console.error("Error starting live slides:", error);
    }
}
    */