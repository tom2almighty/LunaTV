import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const DEFAULT_ALLOWED_PROTOCOLS = ['http:', 'https:'];

export type UrlGuardOptions = {
  allowedHosts?: string[];
  allowedProtocols?: string[];
  resolveHostname?: (hostname: string) => Promise<string[]>;
};

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

function isHostnameAllowed(hostname: string, allowedHosts: string[]): boolean {
  const normalizedHostname = normalizeHost(hostname);
  return allowedHosts.some((allowedHost) => {
    const normalizedAllowedHost = normalizeHost(allowedHost);
    if (!normalizedAllowedHost) {
      return false;
    }

    return (
      normalizedHostname === normalizedAllowedHost ||
      normalizedHostname.endsWith(`.${normalizedAllowedHost}`)
    );
  });
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::' || normalized === '::1') {
    return true;
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  if (normalized.startsWith('fe8') || normalized.startsWith('fe9')) {
    return true;
  }
  if (normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  if (normalized.startsWith('::ffff:')) {
    const mappedIpv4 = normalized.slice('::ffff:'.length);
    return isPrivateIpv4(mappedIpv4);
  }

  return false;
}

function isPrivateOrLoopbackIp(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(address);
  }
  return true;
}

async function defaultResolveHostname(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return Array.from(new Set(records.map((record) => record.address)));
}

export function parseAllowedHostsFromEnv(
  envValue: string | undefined,
): string[] | undefined {
  if (!envValue) {
    return undefined;
  }

  const hosts = envValue
    .split(',')
    .map((item) => normalizeHost(item))
    .filter((item) => item.length > 0);

  if (hosts.length === 0) {
    return undefined;
  }

  return hosts;
}

export async function assertSafeOutgoingUrl(
  rawUrl: string,
  options: UrlGuardOptions = {},
): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  const allowedProtocols =
    options.allowedProtocols || DEFAULT_ALLOWED_PROTOCOLS;
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    throw new Error('Unsupported URL protocol');
  }

  const hostname = normalizeHost(parsedUrl.hostname);
  if (!hostname || hostname === 'localhost') {
    throw new Error('Unsafe target host');
  }

  if (
    options.allowedHosts &&
    options.allowedHosts.length > 0 &&
    !isHostnameAllowed(hostname, options.allowedHosts)
  ) {
    throw new Error('Target host is not whitelisted');
  }

  let resolvedAddresses: string[];
  const ipVersion = isIP(hostname);
  if (ipVersion !== 0) {
    resolvedAddresses = [hostname];
  } else {
    const resolveHostname = options.resolveHostname || defaultResolveHostname;
    resolvedAddresses = await resolveHostname(hostname);
  }

  if (!resolvedAddresses.length) {
    throw new Error('Unable to resolve target host');
  }

  for (const address of resolvedAddresses) {
    if (isPrivateOrLoopbackIp(address)) {
      throw new Error('Target resolves to private or loopback address');
    }
  }

  return parsedUrl;
}
