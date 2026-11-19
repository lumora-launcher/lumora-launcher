const fs = require('fs');
const path = require('path');

const modeArg = (process.argv[2] || '').toLowerCase();
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const isBeta = modeArg === 'beta' || (modeArg !== 'stable' && /-(beta|alpha|rc|preview)/i.test(pkg.version || ''));

pkg.build = pkg.build || {};
pkg.build.win = pkg.build.win || {};
pkg.build.nsis = pkg.build.nsis || {};

if (isBeta) {
  pkg.productName = 'Lumora Launcher Beta';
  pkg.build.appId = 'com.lumora.launcher.beta';
  pkg.build.productName = 'Lumora Launcher Beta';
  pkg.build.icon = 'assets/icon-beta.ico';
  pkg.build.win.target = 'nsis';
  pkg.build.win.icon = 'assets/icon-beta.ico';
  pkg.build.win.artifactName = 'Lumora-Launcher-Beta-Setup-${version}.${ext}';
  pkg.build.nsis.installerIcon = 'assets/icon-beta.ico';
  pkg.build.nsis.uninstallerIcon = 'assets/icon-beta.ico';
  pkg.build.nsis.installerHeaderIcon = 'assets/icon-beta.ico';
  pkg.build.nsis.shortcutName = 'Lumora Launcher Beta';
} else {
  pkg.productName = 'Lumora Launcher';
  pkg.build.appId = 'com.lumora.launcher';
  pkg.build.productName = 'Lumora Launcher';
  pkg.build.icon = 'assets/icon.ico';
  pkg.build.win.target = 'nsis';
  pkg.build.win.icon = 'assets/icon.ico';
  pkg.build.win.artifactName = 'Lumora-Launcher-Setup-${version}.${ext}';
  pkg.build.nsis.installerIcon = 'assets/icon.ico';
  pkg.build.nsis.uninstallerIcon = 'assets/icon.ico';
  pkg.build.nsis.installerHeaderIcon = 'assets/icon.ico';
  pkg.build.nsis.shortcutName = 'Lumora Launcher';
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`[Lumora Channel]: ${isBeta ? 'BETA' : 'STABLE'} yapılandırması uygulandı (${pkg.build.appId} / ${pkg.build.productName})`);
