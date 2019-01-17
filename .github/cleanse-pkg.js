const fs = require('fs');
const path = require('path');

// Define absolute paths for original pkg and temporary pkg.
const ORIG_PKG_PATH = path.resolve(__dirname, '../package.json');

// Obtain original `package.json` contents.
const pkgData = require(ORIG_PKG_PATH);

// Remove the scripts section.
delete pkgData.scripts;

// Remove the devDependencies section.
delete pkgData.devDependencies;

// Remove the husky section.
delete pkgData.husky;

// Overwrite original `package.json` with new data (i.e. minus the specific data).
fs.writeFile(ORIG_PKG_PATH, JSON.stringify(pkgData, null, 2), function (err) {
  if (err) throw err;
});
