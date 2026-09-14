import { api } from "./api";
import type { Participant } from "./participant_service";

export interface Event {
    id: number | null;
    name: string;
    description: string | null;
    date: string | null;
}

export interface EventOption {
    label: string;
    value: number | null;
}

export const getEvents = () => api.get("/events/");

export const getEventById = (id: number) => api.get(`/events/${id}/`);

export const saveEvent = (event: Event) => api.post("/events/", event);

export const getEventOptions = () => api.get("/events/").then(response => {
    const events: Event[] = response.data;
    return events.map((event: Event) => ({
        label: event.name,
        value: event.id
    }));
})