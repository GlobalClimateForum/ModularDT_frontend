import api from "./api";

export const sendModeratorUpdate = (message: any) => api.patch(`/moderator/`, message);
export const sendUpdateParticipantParameter = (parameter_name: string, value: string, sender: string) => api.patch(`/moderator/`, {
    event_type: "update_participant_parameter",
    paricipant: sender,
    parameter_name: parameter_name,
    value: value
});
