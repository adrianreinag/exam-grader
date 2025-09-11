import { apiFetch } from './client';

export interface UserSettings {
  uid: string;
  email: string;
  name: string | null;
  hasOpenaiApiKey: boolean;
}

export interface UpdateUserSettingsInput {
  name?: string;
  openaiApiKey?: string;
}

export interface ApiKeyStatus {
  hasValidApiKey: boolean;
  requiresApiKey: boolean;
}

export async function getUserSettings(): Promise<UserSettings> {
  return apiFetch('/getUserSettingsEndpoint', {
    method: 'GET',
  });
}

export async function updateUserSettings(input: UpdateUserSettingsInput): Promise<UserSettings> {
  return apiFetch('/updateUserSettingsEndpoint', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function checkApiKeyStatus(): Promise<ApiKeyStatus> {
  return apiFetch('/checkApiKeyStatusEndpoint', {
    method: 'GET',
  });
}