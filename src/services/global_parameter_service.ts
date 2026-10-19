import { api } from "./api";

export interface GlobalParameter {
  id?: number;
  active: boolean;
  current_value: string;
  name: string;
  description: string;
  ptype: string;
  connect_all: Boolean;
  pvalues: string[]
  connected_slide_parameters: number[];
}

export const getGlobalParameters = async () => await api.get("/globalparameters/");
export const saveGlobalParameter = (globalparameter: Omit<GlobalParameter, "id">) =>
  api.post("/globalparameters/", { ...globalparameter });

export const deleteGlobalParameter = (id: number) => api.delete(`/globalparameters/${id}/`);
export const deleteGlobalParameters = async () => await api.delete("/globalparameters/");

export const updateGlobalParameter = async (id: number, globpar: Partial<GlobalParameter>) => {
  return await api.patch(`/globalparameters/${id}/`, { ...globpar });
}

