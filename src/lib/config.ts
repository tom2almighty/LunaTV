/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-non-null-assertion */

import { getAdminConfig, getAllUsers, saveAdminConfig } from '@/lib/db.server';

import { AdminConfig, DoubanProxyMode, DoubanProxyPreset } from './admin.types';

export interface ApiSite {
  key: string;
  api: string;
  name: string;
  detail?: string;
}

interface ConfigFileStruct {
  cache_time?: number;
  api_site?: {
    [key: string]: ApiSite;
  };
}

function parseProxyMode(mode: string | undefined): DoubanProxyMode {
  if (mode === 'server' || mode === 'preset' || mode === 'custom') {
    return mode;
  }

  return 'server';
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeProxyCustomUrl(url: unknown): string {
  if (typeof url !== 'string') {
    return '';
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  return isHttpUrl(trimmed) ? trimmed : '';
}

function normalizeProxyPresets(presets: unknown): DoubanProxyPreset[] {
  if (!Array.isArray(presets)) {
    return [];
  }

  const normalized = presets
    .filter((preset): preset is DoubanProxyPreset => {
      return (
        typeof preset === 'object' &&
        preset !== null &&
        typeof preset.id === 'string' &&
        typeof preset.name === 'string' &&
        typeof preset.url === 'string'
      );
    })
    .map((preset) => ({
      id: preset.id.trim(),
      name: preset.name.trim(),
      url: preset.url.trim(),
    }))
    .filter(
      (preset) =>
        preset.id && preset.name && preset.url && isHttpUrl(preset.url),
    );

  const seenIds = new Set<string>();
  return normalized.filter((preset) => {
    if (seenIds.has(preset.id)) {
      return false;
    }
    seenIds.add(preset.id);
    return true;
  });
}

function parseProxyPresetsFromEnv(
  key:
    | 'NEXT_PUBLIC_DOUBAN_DATA_PROXY_PRESETS'
    | 'NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_PRESETS',
): DoubanProxyPreset[] {
  const raw = process.env[key];
  if (!raw) {
    return [];
  }

  try {
    return normalizeProxyPresets(JSON.parse(raw));
  } catch {
    return [];
  }
}

export const API_CONFIG = {
  search: {
    path: '?ac=videolist&wd=',
    pagePath: '?ac=videolist&wd={query}&pg={page}',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
  detail: {
    path: '?ac=videolist&ids=',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
};

let configInitPromise: Promise<AdminConfig> | null = null;

// 从配置文件补充管理员配置
export function refineConfig(adminConfig: AdminConfig): AdminConfig {
  let fileConfig: ConfigFileStruct;
  try {
    fileConfig = JSON.parse(adminConfig.ConfigFile) as ConfigFileStruct;
  } catch (e) {
    fileConfig = {} as ConfigFileStruct;
  }

  // 合并文件中的源信息
  const apiSitesFromFile = Object.entries(fileConfig.api_site || []);
  const currentApiSites = new Map(
    (adminConfig.SourceConfig || []).map((s) => [s.key, s]),
  );

  apiSitesFromFile.forEach(([key, site]) => {
    const existingSource = currentApiSites.get(key);
    if (existingSource) {
      // 如果已存在，只覆盖 name、api、detail 和 from
      existingSource.name = site.name;
      existingSource.api = site.api;
      existingSource.detail = site.detail;
      existingSource.from = 'config';
    } else {
      // 如果不存在，创建新条目
      currentApiSites.set(key, {
        key,
        name: site.name,
        api: site.api,
        detail: site.detail,
        from: 'config',
        disabled: false,
      });
    }
  });

  // 检查现有源是否在 fileConfig.api_site 中，如果不在则标记为 custom
  const apiSitesFromFileKey = new Set(apiSitesFromFile.map(([key]) => key));
  currentApiSites.forEach((source) => {
    if (!apiSitesFromFileKey.has(source.key)) {
      source.from = 'custom';
    }
  });

  // 将 Map 转换回数组
  adminConfig.SourceConfig = Array.from(currentApiSites.values());

  return adminConfig;
}

async function getInitConfig(
  configFile: string,
  subConfig: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  } = {
    URL: '',
    AutoUpdate: false,
    LastCheck: '',
  },
): Promise<AdminConfig> {
  let cfgFile: ConfigFileStruct;
  try {
    cfgFile = JSON.parse(configFile) as ConfigFileStruct;
  } catch (e) {
    cfgFile = {} as ConfigFileStruct;
  }
  const adminConfig: AdminConfig = {
    ConfigFile: configFile,
    ConfigSubscribtion: subConfig,
    SiteConfig: {
      SiteName: process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTV',
      Announcement:
        process.env.ANNOUNCEMENT ||
        '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。',
      SearchDownstreamMaxPage:
        Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
      SiteInterfaceCacheTime: cfgFile.cache_time || 7200,
      DoubanDataCacheTime:
        Number(process.env.NEXT_PUBLIC_DOUBAN_DATA_CACHE_TIME) || 7200,
      DoubanDataProxyMode: parseProxyMode(
        process.env.NEXT_PUBLIC_DOUBAN_DATA_PROXY_MODE,
      ),
      DoubanDataProxyPresetId:
        process.env.NEXT_PUBLIC_DOUBAN_DATA_PROXY_PRESET_ID || '',
      DoubanDataProxyCustomUrl: normalizeProxyCustomUrl(
        process.env.NEXT_PUBLIC_DOUBAN_DATA_PROXY_CUSTOM_URL,
      ),
      DoubanDataProxyPresets: parseProxyPresetsFromEnv(
        'NEXT_PUBLIC_DOUBAN_DATA_PROXY_PRESETS',
      ),
      DoubanImageProxyMode: parseProxyMode(
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_MODE,
      ),
      DoubanImageProxyPresetId:
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_PRESET_ID || '',
      DoubanImageProxyCustomUrl: normalizeProxyCustomUrl(
        process.env.NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_CUSTOM_URL,
      ),
      DoubanImageProxyPresets: parseProxyPresetsFromEnv(
        'NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_PRESETS',
      ),
      DisableYellowFilter:
        process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER === 'true',
      FluidSearch: process.env.NEXT_PUBLIC_FLUID_SEARCH !== 'false',
      EnableRegistration:
        process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === 'true', // 默认关闭注册
      M3U8AdFilterEnabled:
        process.env.NEXT_PUBLIC_M3U8_AD_FILTER_ENABLED !== 'false',
    },
    UserConfig: {
      Users: [],
    },
    SourceConfig: [],
  };

  // 补充用户信息
  let userNames: string[] = [];
  try {
    userNames = await getAllUsers();
  } catch (e) {
    console.error('获取用户列表失败:', e);
  }
  const allUsers = userNames
    .filter((u) => u !== process.env.APP_ADMIN_USERNAME)
    .map((u) => ({
      username: u,
      role: 'user',
      banned: false,
    }));
  allUsers.unshift({
    username: process.env.APP_ADMIN_USERNAME!,
    role: 'owner',
    banned: false,
  });
  adminConfig.UserConfig.Users = allUsers as any;

  // 从配置文件中补充源信息
  Object.entries(cfgFile.api_site || []).forEach(([key, site]) => {
    adminConfig.SourceConfig.push({
      key: key,
      name: site.name,
      api: site.api,
      detail: site.detail,
      from: 'config',
      disabled: false,
    });
  });

  return adminConfig;
}

export async function getConfig(): Promise<AdminConfig> {
  try {
    const adminConfig = await getAdminConfig();
    if (adminConfig) {
      return configSelfCheck(adminConfig);
    }
  } catch (e) {
    console.error('获取管理员配置失败:', e);
  }

  if (configInitPromise) {
    return configInitPromise;
  }

  configInitPromise = (async () => {
    let initializedConfig = await getInitConfig('');
    initializedConfig = configSelfCheck(initializedConfig);

    try {
      await saveAdminConfig(initializedConfig);
    } catch (e) {
      console.error('保存管理员配置失败:', e);
    }

    return initializedConfig;
  })().finally(() => {
    configInitPromise = null;
  });

  return configInitPromise;
}

export function configSelfCheck(adminConfig: AdminConfig): AdminConfig {
  // 确保必要的属性存在和初始化
  if (!adminConfig.UserConfig) {
    adminConfig.UserConfig = { Users: [] };
  }
  if (
    !adminConfig.UserConfig.Users ||
    !Array.isArray(adminConfig.UserConfig.Users)
  ) {
    adminConfig.UserConfig.Users = [];
  }
  if (!adminConfig.SourceConfig || !Array.isArray(adminConfig.SourceConfig)) {
    adminConfig.SourceConfig = [];
  }
  if (!adminConfig.SiteConfig) {
    adminConfig.SiteConfig = {} as AdminConfig['SiteConfig'];
  }
  adminConfig.SiteConfig.DoubanDataProxyMode = parseProxyMode(
    adminConfig.SiteConfig.DoubanDataProxyMode,
  );
  adminConfig.SiteConfig.DoubanDataProxyPresetId =
    typeof adminConfig.SiteConfig.DoubanDataProxyPresetId === 'string'
      ? adminConfig.SiteConfig.DoubanDataProxyPresetId
      : '';
  adminConfig.SiteConfig.DoubanDataProxyCustomUrl = normalizeProxyCustomUrl(
    adminConfig.SiteConfig.DoubanDataProxyCustomUrl,
  );
  adminConfig.SiteConfig.DoubanDataProxyPresets = normalizeProxyPresets(
    adminConfig.SiteConfig.DoubanDataProxyPresets,
  );
  adminConfig.SiteConfig.DoubanImageProxyMode = parseProxyMode(
    adminConfig.SiteConfig.DoubanImageProxyMode,
  );
  adminConfig.SiteConfig.DoubanImageProxyPresetId =
    typeof adminConfig.SiteConfig.DoubanImageProxyPresetId === 'string'
      ? adminConfig.SiteConfig.DoubanImageProxyPresetId
      : '';
  adminConfig.SiteConfig.DoubanImageProxyCustomUrl = normalizeProxyCustomUrl(
    adminConfig.SiteConfig.DoubanImageProxyCustomUrl,
  );
  adminConfig.SiteConfig.DoubanImageProxyPresets = normalizeProxyPresets(
    adminConfig.SiteConfig.DoubanImageProxyPresets,
  );
  if (typeof adminConfig.SiteConfig.M3U8AdFilterEnabled !== 'boolean') {
    adminConfig.SiteConfig.M3U8AdFilterEnabled = true;
  }
  // 站长变更自检
  const ownerUser = process.env.APP_ADMIN_USERNAME;

  // 去重
  const seenUsernames = new Set<string>();
  adminConfig.UserConfig.Users = adminConfig.UserConfig.Users.filter((user) => {
    if (seenUsernames.has(user.username)) {
      return false;
    }
    seenUsernames.add(user.username);
    return true;
  });
  // 过滤站长
  const originOwnerCfg = adminConfig.UserConfig.Users.find(
    (u) => u.username === ownerUser,
  );
  adminConfig.UserConfig.Users = adminConfig.UserConfig.Users.filter(
    (user) => user.username !== ownerUser,
  );
  // 其他用户不得拥有 owner 权限
  adminConfig.UserConfig.Users.forEach((user) => {
    if (user.role === 'owner') {
      user.role = 'user';
    }
  });
  // 重新添加回站长
  adminConfig.UserConfig.Users.unshift({
    username: ownerUser!,
    role: 'owner',
    banned: false,
    enabledApis: originOwnerCfg?.enabledApis || undefined,
    tags: originOwnerCfg?.tags || undefined,
  });

  // 采集源去重
  const seenSourceKeys = new Set<string>();
  adminConfig.SourceConfig = adminConfig.SourceConfig.filter((source) => {
    if (seenSourceKeys.has(source.key)) {
      return false;
    }
    seenSourceKeys.add(source.key);
    return true;
  });

  return adminConfig;
}

export async function resetConfig() {
  let originConfig: AdminConfig | null = null;
  try {
    originConfig = await getAdminConfig();
  } catch (e) {
    console.error('获取管理员配置失败:', e);
  }
  if (!originConfig) {
    originConfig = {} as AdminConfig;
  }
  const adminConfig = await getInitConfig(
    originConfig.ConfigFile,
    originConfig.ConfigSubscribtion,
  );
  await saveAdminConfig(adminConfig);

  return;
}

export async function getCacheTime(): Promise<number> {
  const config = await getConfig();
  return config.SiteConfig.SiteInterfaceCacheTime || 7200;
}

export async function getDoubanCacheTime(): Promise<number> {
  const config = await getConfig();
  return config.SiteConfig.DoubanDataCacheTime || 7200;
}

export async function getAvailableApiSites(user?: string): Promise<ApiSite[]> {
  const config = await getConfig();
  const allApiSites = config.SourceConfig.filter((s) => !s.disabled);

  if (!user) {
    return allApiSites;
  }

  const userConfig = config.UserConfig.Users.find((u) => u.username === user);
  if (!userConfig) {
    return allApiSites;
  }

  // 优先根据用户自己的 enabledApis 配置查找
  if (userConfig.enabledApis && userConfig.enabledApis.length > 0) {
    const userApiSitesSet = new Set(userConfig.enabledApis);
    return allApiSites
      .filter((s) => userApiSitesSet.has(s.key))
      .map((s) => ({
        key: s.key,
        name: s.name,
        api: s.api,
        detail: s.detail,
      }));
  }

  // 如果没有 enabledApis 配置，则根据 tags 查找
  if (userConfig.tags && userConfig.tags.length > 0 && config.UserConfig.Tags) {
    const enabledApisFromTags = new Set<string>();

    // 遍历用户的所有 tags，收集对应的 enabledApis
    userConfig.tags.forEach((tagName) => {
      const tagConfig = config.UserConfig.Tags?.find((t) => t.name === tagName);
      if (tagConfig && tagConfig.enabledApis) {
        tagConfig.enabledApis.forEach((apiKey) =>
          enabledApisFromTags.add(apiKey),
        );
      }
    });

    if (enabledApisFromTags.size > 0) {
      return allApiSites
        .filter((s) => enabledApisFromTags.has(s.key))
        .map((s) => ({
          key: s.key,
          name: s.name,
          api: s.api,
          detail: s.detail,
        }));
    }
  }

  // 如果都没有配置，返回所有可用的 API 站点
  return allApiSites;
}

export async function setCachedConfig(config: AdminConfig) {
  await saveAdminConfig(configSelfCheck(config));
}
