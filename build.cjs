// Rebuild the portable page using only Node.js standard modules.
const fs = require("node:fs");
const path = require("node:path");
const read = (file) => fs.readFileSync(path.join(__dirname, file), "utf8");
let html = read("index.html");
html = html.replace(
  /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g,
  (_, file) => "<style>\n" + read(file) + "\n</style>",
);
html = html.replace(/<script\s+src="([^"]+)"><\/script>/g, (_, file) => {
  const script = read(file).replace(/<\/script/gi, "<\\/script");
  return "<script>\n" + script + "\n</script>";
});
fs.writeFileSync(path.join(__dirname, "hujiang.html"), html);
