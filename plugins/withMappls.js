const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 1. Add Mappls Maven repository to android/build.gradle
function withMapplsMavenRepo(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'build.gradle');
      let content = fs.readFileSync(buildGradlePath, 'utf8');

      const mapplsMaven = "        maven { url 'https://maven.mappls.com/repository/mappls/' }";

      // Only add if not already present
      if (!content.includes('maven.mappls.com')) {
        const anchor = "    maven { url 'https://www.jitpack.io' }";
        const allprojectsAnchor = /allprojects\s*{\s*repositories\s*{/;

        if (content.includes(anchor)) {
          content = content.replace(anchor, anchor + '\n' + mapplsMaven);
        } else if (allprojectsAnchor.test(content)) {
          content = content.replace(allprojectsAnchor, (m) => m + '\n' + mapplsMaven);
        } else {
          throw new Error(
            '[withMappls] Could not find a repositories block in android/build.gradle to insert the Mappls maven repo into. ' +
            'The Mappls native SDK will fail to resolve at build time — add ' +
            "\"maven { url 'https://maven.mappls.com/repository/mappls/' }\" to allprojects.repositories manually."
          );
        }

        fs.writeFileSync(buildGradlePath, content, 'utf8');
        console.log('[withMappls] Added Mappls Maven repo to build.gradle');
      }

      return config;
    },
  ]);
}

// 2. Copy .conf and .olf license files to android/app/src/main/assets/
function withMapplsAssets(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const assetsDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      const sourceDir = path.join(config.modRequest.projectRoot, 'assets');
      const licenseFiles = fs.readdirSync(sourceDir).filter(
        (f) => f.endsWith('.conf') || f.endsWith('.olf')
      );

      if (licenseFiles.length === 0) {
        throw new Error(
          `[withMappls] No .conf/.olf Mappls license files found in ${sourceDir}. ` +
          'The native Mappls SDK has no license to load and will fail to initialize at runtime.'
        );
      }

      for (const file of licenseFiles) {
        fs.copyFileSync(path.join(sourceDir, file), path.join(assetsDir, file));
        console.log('[withMappls] Copied', file, '→ android/app/src/main/assets/');
      }

      return config;
    },
  ]);
}

module.exports = function withMappls(config) {
  config = withMapplsMavenRepo(config);
  config = withMapplsAssets(config);
  return config;
};
