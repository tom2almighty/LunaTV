import type { DoubanProxyMode, DoubanProxyPreset } from '@/lib/admin.types';

export type ResolvedDoubanProxy = {
  proxyType: 'server' | 'custom';
  proxyUrl: string;
};

type RuntimeDoubanProxySettings = {
  mode: DoubanProxyMode;
  presetId: string;
  customUrl: string;
  presets: DoubanProxyPreset[];
};

type StorageDoubanProxySettings = {
  mode?: string | null;
  presetId?: string | null;
  customUrl?: string | null;
};

type ResolveDoubanProxyInput = {
  runtime: RuntimeDoubanProxySettings;
  storage?: StorageDoubanProxySettings;
};

function normalizeMode(
  value: string | undefined | null,
  fallback: DoubanProxyMode,
): DoubanProxyMode {
  if (value === 'server' || value === 'preset' || value === 'custom') {
    return value;
  }

  return fallback;
}

function pickString(
  value: string | null | undefined,
  fallback: string,
): string {
  return typeof value === 'string' ? value : fallback;
}

function resolveDoubanProxy(
  input: ResolveDoubanProxyInput,
): ResolvedDoubanProxy {
  const mode = normalizeMode(input.storage?.mode, input.runtime.mode);
  const presetId = pickString(
    input.storage?.presetId,
    input.runtime.presetId,
  ).trim();
  const customUrl = pickString(
    input.storage?.customUrl,
    input.runtime.customUrl,
  ).trim();

  if (mode === 'preset') {
    const selectedPreset = input.runtime.presets.find(
      (preset) => preset.id === presetId,
    );
    if (selectedPreset?.url?.trim()) {
      return {
        proxyType: 'custom',
        proxyUrl: selectedPreset.url.trim(),
      };
    }
    return {
      proxyType: 'server',
      proxyUrl: '',
    };
  }

  if (mode === 'custom') {
    if (customUrl) {
      return {
        proxyType: 'custom',
        proxyUrl: customUrl,
      };
    }
    return {
      proxyType: 'server',
      proxyUrl: '',
    };
  }

  return {
    proxyType: 'server',
    proxyUrl: '',
  };
}

export function resolveDoubanDataProxy(
  input: ResolveDoubanProxyInput,
): ResolvedDoubanProxy {
  return resolveDoubanProxy(input);
}

export function resolveDoubanImageProxy(
  input: ResolveDoubanProxyInput,
): ResolvedDoubanProxy {
  return resolveDoubanProxy(input);
}
