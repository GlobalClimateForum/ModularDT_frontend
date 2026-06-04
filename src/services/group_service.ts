import api from "./api";

export interface Group {
    id: number;
    name: string;
}

export const getGroups = () => api.get("/groups/");