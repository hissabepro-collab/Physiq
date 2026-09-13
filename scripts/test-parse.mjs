import fs from "fs";
import { parseVisbodyPdf } from "./src/lib/parseVisbodyPdf.js";

const files = process.argv.slice(2);
for (const f of files) {
  const buf = fs.readFileSync(f);
  const { donnees, warnings } = await parseVisbodyPdf(buf, f.split(/[\\/]/).pop());
  console.log("\n=================", f.split(/[\\/]/).pop(), "=================");
  console.log(donnees);
  if (warnings.length) console.log("WARNINGS:", warnings);
}
