import api from "./api";

export interface Participant {
    id: number;
    name: string;
}

export const getParticipants = () => api.get("/participants/");