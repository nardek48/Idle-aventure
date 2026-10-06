"use strict";
/* sim/index-scripts.js — liste des scripts d'index.html, dans l'ordre de chargement.
   Remplace /tmp/scripts.txt (Linux seul) : marche partout, toujours à jour avec index.html.
   Usage : require("./sim/index-scripts.js")(root, /pwa\.js|boot\.js/)  -> ["js/core/constants.js", ...] */
var fs = require("fs"), path = require("path");

module.exports = function indexScripts(root, exclure) {
  // Les commentaires HTML sont retirés d'abord : un <script> commenté ne doit pas être chargé.
  var html = fs.readFileSync(path.join(root || ".", "index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  var scripts = [], re = /<script\s+src="([^"]+\.js)"/g, m;
  while ((m = re.exec(html)) !== null) if (!exclure || !exclure.test(m[1])) scripts.push(m[1]);
  if (!scripts.length) throw new Error("Aucun <script src> trouvé dans " + path.join(root || ".", "index.html"));
  return scripts;
};
