import api from "./api";

export interface Participant {
    id: number | null;
    name: string;
    seat: number | null;
    interactions: boolean;
}

export const getParticipants = () => api.get("/participants/");
export const updateParticipant = (participant: Participant) => api.put(`/participants/${participant.id}/`, participant);
export const createParticipant = (participant: Participant) => api.post("/participants/", participant);