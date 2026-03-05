export interface DataSource {
  key: string;
  name: string;
  api: string;
  detail?: string;
  from: 'config' | 'custom';
  disabled?: boolean;
}

export type DoubanProxyMode = 'server' | 'preset' | 'custom';

export interface DoubanProxyPreset {
  id: string;
  name: string;
  url: string;
}

export interface SiteConfig {
  SiteName: string;
  Announcement: string;
  SearchDownstreamMaxPage: number;
  SiteInterfaceCacheTime: number;
  DoubanDataCacheTime: number;
  DoubanDataProxyMode: DoubanProxyMode;
  DoubanDataProxyPresetId: string;
  DoubanDataProxyCustomUrl: string;
  DoubanDataProxyPresets: DoubanProxyPreset[];
  DoubanImageProxyMode: DoubanProxyMode;
  DoubanImageProxyPresetId: string;
  DoubanImageProxyCustomUrl: string;
  DoubanImageProxyPresets: DoubanProxyPreset[];
  DisableYellowFilter: boolean;
  FluidSearch: boolean;
  EnableRegistration: boolean;
  M3U8AdFilterEnabled: boolean;
}

export interface AdminConfig {
  ConfigSubscribtion: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  };
  ConfigFile: string;
  SiteConfig: SiteConfig;
  UserConfig: {
    Users: {
      username: string;
      role: 'user' | 'admin' | 'owner';
      banned?: boolean;
      enabledApis?: string[]; // 优先级高于tags限制
      tags?: string[]; // 多 tags 取并集限制
    }[];
    Tags?: {
      name: string;
      enabledApis: string[];
    }[];
  };
  SourceConfig: {
    key: string;
    name: string;
    api: string;
    detail?: string;
    from: 'config' | 'custom';
    disabled?: boolean;
  }[];
}

export interface AdminConfigResult {
  Role: 'owner' | 'admin';
  Config: AdminConfig;
}
