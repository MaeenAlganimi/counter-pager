// Run on a trusted Node server; never send signing credentials to a browser.
import { PKPass } from "passkit-generator";
import { readFile, writeFile } from "node:fs/promises";
const required = [
  "APPLE_PASS_TYPE_ID",
  "APPLE_TEAM_ID",
  "APPLE_SIGNER_CERT",
  "APPLE_SIGNER_KEY",
  "APPLE_WWDR_CERT",
];
for (const name of required)
  if (!process.env[name]) throw new Error(`Missing ${name}`);
const [inputPath, outputPath = "order.pkpass"] = process.argv.slice(2);
if (!inputPath)
  throw new Error("Usage: npm run generate -- ticket.json [order.pkpass]");
const { ticket, business, app_url } = JSON.parse(
  await readFile(inputPath, "utf8"),
);
if (!ticket?.id || !business?.name || !app_url?.startsWith("https://"))
  throw new Error("Expected ticket, business and HTTPS app_url");
const pass = new PKPass(
  {
    "icon.png": await readFile(
      new URL("../../public/icon-192.png", import.meta.url),
    ),
    "icon@2x.png": await readFile(
      new URL("../../public/icon-512.png", import.meta.url),
    ),
  },
  {
    wwdr: await readFile(process.env.APPLE_WWDR_CERT),
    signerCert: await readFile(process.env.APPLE_SIGNER_CERT),
    signerKey: await readFile(process.env.APPLE_SIGNER_KEY),
    signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE,
  },
  {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
    teamIdentifier: process.env.APPLE_TEAM_ID,
    serialNumber: ticket.id,
    organizationName: business.name,
    description: "Order pickup ticket",
    logoText: business.name,
    foregroundColor: "rgb(255,255,255)",
    backgroundColor: "rgb(25,60,186)",
  },
);
pass.type = "generic";
pass.primaryFields.push({
  key: "order",
  label: "Order",
  value: "#" + String(ticket.number).padStart(3, "0"),
});
pass.secondaryFields.push({
  key: "status",
  label: "Status",
  value: ticket.status,
});
if (ticket.eta_at)
  pass.auxiliaryFields.push({
    key: "eta",
    label: "Estimated pickup",
    value: ticket.eta_at,
  });
pass.setBarcodes({
  format: "PKBarcodeFormatQR",
  message: `${app_url.replace(/\/$/, "")}/t/${ticket.id}`,
  messageEncoding: "iso-8859-1",
});
await writeFile(outputPath, pass.getAsBuffer());
console.log(`Created ${outputPath}`);
