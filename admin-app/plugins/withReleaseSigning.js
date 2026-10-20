// Signs release builds with the admin app's own key (keystore/keystore.properties, kept out of
// git). Without that file, release builds fall back to the debug key so they still build.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// mth-admin release signing';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARK)) return cfg;

    gradle = gradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        ${MARK}
        release {
            def propsFile = rootProject.file('../keystore/keystore.properties')
            if (propsFile.exists()) {
                def props = new Properties()
                propsFile.withInputStream { props.load(it) }
                storeFile rootProject.file('../keystore/' + props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`,
    );
    // The release build type uses the release signing config
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
