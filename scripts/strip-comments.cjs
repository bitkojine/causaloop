const fs = require("fs");
const path = require("path");
// Check if we can require typescript from node_modules
let ts;
try {
  ts = require("typescript");
} catch (e) {
  // Try resolving from local node_modules manually if global require fails
  ts = require(path.resolve("node_modules/typescript"));
}

const scanDir = (dir) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && file !== ".turbo") {
        scanDir(fullPath);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      if (file.endsWith(".d.ts")) continue; // Skip definition files to be safe

      try {
        const content = fs.readFileSync(fullPath, "utf8");

        // Create source file
        const sourceFile = ts.createSourceFile(
          fullPath,
          content,
          ts.ScriptTarget.Latest,
          true, // setParentNodes
        );

        // Create printer with removeComments: true
        const printer = ts.createPrinter({
          removeComments: true,
          newLine: ts.NewLineKind.LineFeed,
        });

        // Print the file
        const result = printer.printFile(sourceFile);

        // Only write if content changed (ignoring whitespace diffs that formatter will fix)
        // Actually, just write it.
        fs.writeFileSync(fullPath, result);
        console.log(`✓ Stripped comments: ${fullPath}`);
      } catch (err) {
        console.error(`Error processing ${fullPath}:`, err.message);
      }
    }
  }
};

console.log("Starting comment stripping...");
scanDir("packages");
console.log("Done.");
