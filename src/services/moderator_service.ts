import api from "./api";

export const sendModeratorMessage = (message: any) => api.patch(`/moderator/`, message);


