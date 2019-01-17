const path = require("path");
const fs = require("fs");

// Read development version of package.json.
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', "package.json")).toString());

// Remove unnecessary entries and reformat.
delete packageJson.scripts;
delete packageJson.husky;
delete packageJson.devDependencies;
const simplifiedPackageJson = JSON.stringify(packageJson, null, 2);

// Update the extracted version of package.json with simplified one.
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'package.json'), simplifiedPackageJson, {
  encoding: "utf-8"
});

// Copy README.md
fs.createReadStream(path.join(__dirname, '..', 'README.md')).pipe(fs.createWriteStream(path.join(__dirname, '..', 'dist', 'README.md')));

// Copy LICENCE
fs.createReadStream(path.join(__dirname, '..', 'LICENSE')).pipe(fs.createWriteStream(path.join(__dirname, '..', 'dist', 'LICENSE')));

// Copy CHANGELOG.md
fs.createReadStream(path.join(__dirname, '..', 'CHANGELOG.md')).pipe(fs.createWriteStream(path.join(__dirname, '..', 'dist', 'CHANGELOG.md')));
