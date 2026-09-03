import api from "./api";

export const sendModeratorUpdate = (message: any) => api.patch(`/moderator/`, message);

