import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const pub = process.env.APP_VARIANT === 'public';
  const group = pub ? 'group.com.giovlnv.familiar' : 'group.com.giovlnv.tarotreader';
  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      bundleIdentifier: pub ? 'com.giovlnv.familiar' : config.ios?.bundleIdentifier,
      entitlements: { ...config.ios?.entitlements, 'com.apple.security.application-groups': [group] },
    },
    updates: pub ? { ...config.updates, enabled: false } : config.updates,
    extra: { ...config.extra, variant: pub ? 'public' : 'personal' },
  };
};
