const path = require("path");
const fs = require("fs-extra");
const tar = require ("tar");

// Read development version of package.json.
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', "package.json")).toString());

const packageName = path.join(__dirname, '..', `it-quasar-rx-forms-${packageJson.version}.tgz`);
fs.readdirSync(path.join(__dirname, '..')).forEach(file => {
  console.log(file);
});

// Extract package made by `yarn pack`.
tar.extract({
  file: packageName,
  sync: true
});

// Remove unnecessary entries and reformat.
delete packageJson.scripts;
delete packageJson.husky;
delete packageJson.devDependencies;
delete packageJson.files;
const simplifiedPackageJson = JSON.stringify(packageJson, null, 2);

// Update the extracted version of package.json with simplified one.
fs.writeFileSync("package/package.json", simplifiedPackageJson, {
  encoding: "utf-8"
});

// Recreate package archive.
tar.create(
  {
    gzip: true,
    sync: true,
    file: packageName,
  },
  ["package/"]
);

fs.removeSync("package");
