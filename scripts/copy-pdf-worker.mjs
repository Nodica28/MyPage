// Cross-platform copy of react-pdf's pdf worker into client/public.
// Resilient to npm vs pnpm layouts; warns (does not fail the build) if not found.
import fs from "fs";
import path from "path";
import {createRequire} from "module";

const require = createRequire(import.meta.url);
const dest = path.join("client", "public", "pdf.worker.min.js");

const candidates = [];
for (const spec of [
  "pdfjs-dist/build/pdf.worker.min.js",
  "react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.js"
]) {
  try {
    candidates.push(require.resolve(spec));
  } catch {
    // not resolvable in this layout; try the next candidate
  }
}
candidates.push(
  path.join(
    "node_modules",
    "react-pdf",
    "node_modules",
    "pdfjs-dist",
    "build",
    "pdf.worker.min.js"
  ),
  path.join("node_modules", "pdfjs-dist", "build", "pdf.worker.min.js")
);

const src = candidates.find((c) => {
  try {
    return fs.existsSync(c);
  } catch {
    return false;
  }
});

if (!src) {
  console.warn(
    "[copy-pdf-worker] pdf.worker.min.js not found; skipping (PDF rendering may not work until resolved)."
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), {recursive: true});
fs.copyFileSync(src, dest);
console.log(`[copy-pdf-worker] copied ${src} -> ${dest}`);
