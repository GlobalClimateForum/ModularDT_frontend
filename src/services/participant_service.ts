import api from "./api";

export interface Participant {
    id: number | null;
    name: string;
    seat: number | null;
    interactions: boolean;
}

export const getParticipants = () => api.get("/participants/");