var http = require("http"), fs = require("fs"), path = require("path"), chromium = require("playwright").chromium;
var ROOT = __dirname, MIME = { ".html": "text/html", ".js": "application/javascript", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".png": "image/png" };
var srv = http.createServer(function (q, r) { var p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(p, function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); r.end(d); }); }).listen(0, async function () {
  var b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  var p = await b.newPage({ viewport: { width: 512, height: 512 } });
  p.on("console", m => console.log("PAGE", m.text())); p.on("pageerror", e => console.log("ERR", e.message));
  await p.goto("http://localhost:" + srv.address().port + "/render.html");
  await p.evaluate(() => window.ready);
  var f = await p.evaluate(() => window.faces());
  fs.writeFileSync(path.join(ROOT, "faces.json"), JSON.stringify(f));
  console.log("faces", f.length, f.slice(0, 22).map(x => x[3].toFixed(3)).join(" "));
  var url = await p.evaluate(() => window.shot(0.2, 0.3, 0.1, 0.92));
  fs.writeFileSync(path.join(ROOT, "test.png"), Buffer.from(url.split(",")[1], "base64"));
  await b.close(); srv.close();
});
