import { api } from "./api";
import type { ParameterChange } from "./parameterstore_service";
import { useParameterStore } from './parameterstore_service';

const parameterStore = useParameterStore();

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
  
  // Update the parameter store with the new value
  const pChange:ParameterChange = {
    section: 'global',
    parameter: globpar.name ?? "unknown",
    value: globpar.current_value
  };
  
  // Only update the parameter store if path is successful
  return await api.patch(`/globalparameters/${id}/`, { ...globpar }).then((response) => {
    if (response.status === 200) {
      parameterStore.set(pChange);
    }
    return response;
  });
}

