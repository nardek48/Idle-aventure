var http = require("http"), fs = require("fs"), path = require("path"), chromium = require("playwright").chromium;
var ROOT = __dirname, MIME = { ".html": "text/html", ".js": "application/javascript" };
var FACE = { 1: 16, 2: 14, 3: 10, 4: 0, 5: 8, 6: 4, 7: 19, 8: 13, 9: 7, 10: 9, 11: 1, 12: 5, 13: 12, 14: 18, 15: 6, 16: 2, 17: 11, 18: 3, 19: 15, 20: 17 };
var srv = http.createServer(function (q, r) { var p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(p, function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); r.end(d); }); }).listen(0, async function () {
  var b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  var p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.goto("http://localhost:" + srv.address().port + "/render.html"); await p.evaluate(() => window.ready);
  var fsx = JSON.parse(fs.readFileSync(path.join(ROOT, "faces.json"))); var centres = {};
  for (var v = 1; v <= 20; v++) {
    var r = await p.evaluate(([f, i]) => { window.hideNumber(f, i); const q = window.faceQuat(f, i, 0, 0.16, false); window.shot(q[0], q[1], q[2], q[3]);
      return { url: window.shot(q[0], q[1], q[2], q[3]), c: window.faceCenter(f, i) }; }, [fsx, FACE[v]]);
    fs.writeFileSync(path.join(ROOT, "out", "blank_" + v + ".png"), Buffer.from(r.url.split(",")[1], "base64")); centres[v] = r.c;
  }
  fs.writeFileSync(path.join(ROOT, "centres.json"), JSON.stringify(centres)); console.log(JSON.stringify(centres[1]), JSON.stringify(centres[20]));
  await b.close(); srv.close();
});
