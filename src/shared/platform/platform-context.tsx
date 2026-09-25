import { createContext, useContext } from 'react';
import type { ApiClient } from '../api/client';
import type { PortalConfig } from './portal';

interface PlatformContextValue {
  config: PortalConfig;
  api: ApiClient;
}

export const PlatformContext = createContext<PlatformContextValue | null>(null);

function usePlatform(): PlatformContextValue {
  const value = useContext(PlatformContext);
  if (!value) throw new Error('usePlatform must be used inside <PlatformProvider>');
  return value;
}

export function useApi(): ApiClient {
  return usePlatform().api;
}

export function usePortal(): PortalConfig {
  return usePlatform().config;
}
