import { api } from "./api";
import type { ParameterChange } from "./parameterstore_service";
import { useParameterStore } from './parameterstore_service';
import { LANGUAGE_NAMES } from '@/constants/languages';

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

// --- Language sync: mirror the settings language into the parameter store ---

export const LANGUAGE_PARAMETER_NAME = 'language';

/**
 * Ensure a global parameter named 'language' exists and holds the given value.
 * One-way sync: settings language -> global parameter -> parameter store (WS broadcast).
 * Idempotent: does nothing if the parameter already holds the current value.
 */
export async function syncLanguageParameter(language: string) {
  const { data } = await getGlobalParameters();
  const existing = data.find((p: GlobalParameter) => p.name === LANGUAGE_PARAMETER_NAME);

  if (!existing) {
    await saveGlobalParameter({
      name: LANGUAGE_PARAMETER_NAME,
      description: 'Current language (mirrored from global settings)',
      ptype: 'select',
      pvalues: Object.keys(LANGUAGE_NAMES),
      current_value: language,
      active: true,
      connect_all: false,
      connected_slide_parameters: []
    });
    // The parameter store is hydrated on startup; push the fresh value now as well
    parameterStore.set({
      section: 'global',
      parameter: LANGUAGE_PARAMETER_NAME,
      value: language
    });
  } else if (existing.current_value !== language) {
    // updateGlobalParameter() already pushes the change into the parameter store
    await updateGlobalParameter(existing.id!, { name: existing.name, current_value: language });
  }
}

