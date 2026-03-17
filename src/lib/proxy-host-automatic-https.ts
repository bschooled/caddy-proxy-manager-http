export type ProxyHostAutomaticHttpsMeta = {
  disable_certs?: boolean;
};

type ProxyHostMetaEnvelope = {
  automatic_https?: ProxyHostAutomaticHttpsMeta;
};

export function sanitizeProxyHostAutomaticHttpsMeta(
  meta: ProxyHostAutomaticHttpsMeta | null | undefined
): ProxyHostAutomaticHttpsMeta | undefined {
  if (!meta?.disable_certs) {
    return undefined;
  }

  return { disable_certs: true };
}

export function parseProxyHostAutomaticHttpsMeta(value: string | null | undefined): ProxyHostAutomaticHttpsMeta | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as ProxyHostMetaEnvelope;
    return sanitizeProxyHostAutomaticHttpsMeta(parsed.automatic_https);
  } catch {
    return undefined;
  }
}

export function isProxyHostPublicCertAutomationEnabled(options: {
  certificateId: number | null | undefined;
  meta: string | null | undefined;
  globalPublicCertAutomationEnabled: boolean;
}): boolean {
  if (options.certificateId != null) {
    return false;
  }

  if (!options.globalPublicCertAutomationEnabled) {
    return false;
  }

  const automaticHttps = parseProxyHostAutomaticHttpsMeta(options.meta);
  return !automaticHttps?.disable_certs;
}