import { type IMLinkParam } from "jimu-ui/advanced/setting-components";

export interface IMConfig {
  apiBaseUrl?: string;
  apiToken?: string;
  enablePagination?: boolean;
  itemsPerPage?: number;
  linkParam?: IMLinkParam;
}

/**
 * Get the API base URL - always returns the fixed API endpoint.
 * All API requests will go to https://geomodul.cmspace.uz/api
 */
export function getApiBaseUrl(): string {
  return 'https://geomodul.cmspace.uz/api';
}

export const defaultConfig: IMConfig = {
  apiBaseUrl: getApiBaseUrl(),
  apiToken: "",
  enablePagination: true,
  itemsPerPage: 20
};

