var http = require("http"), fs = require("fs"), path = require("path"), chromium = require("playwright").chromium;
var ROOT = __dirname, MIME = { ".html": "text/html", ".js": "application/javascript", ".gltf": "model/gltf+json" };
var MAP = { 1: [16, 5], 2: [14, 5], 3: [10, 4], 4: [0, 4], 5: [8, 1], 6: [4, 4], 7: [19, 2], 8: [13, 2], 9: [7, 1], 10: [9, 4], 11: [1, 2], 12: [5, 2], 13: [12, 5], 14: [18, 5], 15: [6, 1], 16: [2, 1], 17: [11, 1], 18: [3, 1], 19: [15, 2], 20: [17, 2] };
var srv = http.createServer(function (q, r) { var p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(p, function (e, d) { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); r.end(d); }); }).listen(0, async function () {
  var b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  var p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.goto("http://localhost:" + srv.address().port + "/render.html"); await p.evaluate(() => window.ready);
  await p.evaluate(() => { const c = window.__cam || null; });
  var fsx = JSON.parse(fs.readFileSync(path.join(ROOT, "faces.json")));
  fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
  for (var v = 1; v <= 20; v++) {
    var m = MAP[v];
    var url = await p.evaluate(([f, i, k]) => { const q = window.faceQuat(f, i, k % 3, 0.16, k >= 3); return window.shot(q[0], q[1], q[2], q[3]); }, [fsx, m[0], m[1]]);
    fs.writeFileSync(path.join(ROOT, "out", "face_" + v + ".png"), Buffer.from(url.split(",")[1], "base64"));
  }
  // roulé : deux tours sur un axe penché, 16 images
  for (var t = 0; t < 16; t++) {
    var url2 = await p.evaluate((t) => { const T = window.THREE; const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0.6, 1, 0.35).normalize(), t / 16 * Math.PI * 2 * 1); const q0 = new T.Quaternion().setFromEuler(new T.Euler(0.4, 0.2, 0.1)); q.multiply(q0); return window.shot(q.x, q.y, q.z, q.w); }, t);
    fs.writeFileSync(path.join(ROOT, "out", "roll_" + t + ".png"), Buffer.from(url2.split(",")[1], "base64"));
  }
  await b.close(); srv.close();
});
