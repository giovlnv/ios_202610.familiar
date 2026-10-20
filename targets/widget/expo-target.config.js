/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'FamiliarWidget',
  displayName: 'Familiar',
  deploymentTarget: '17.0',
  bundleIdentifier: '.widget',
  colors: { $accent: '#D9B45B', $widgetBackground: '#14111C' },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
