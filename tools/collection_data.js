#!/usr/bin/env node
// ซิงก์ข้อมูลคลัง XBep ระหว่าง collections_merged.json (source of truth) กับ array ที่ฝังใน index.html
// ใช้: node tools/collection_data.js extract | inject | check
//
//   extract  index.html → collections_merged.json   (ดึงข้อมูลจริงออกมาเก็บ)
//   inject   collections_merged.json → index.html    (เขียนข้อมูลจาก JSON กลับเข้าหน้าเว็บ)
//   check    เทียบสองฝั่ง ต่างกันให้ exit 1           (ใช้ใน CI / สคริปต์ประจำวันได้)
//
// สคริปต์ Python อื่น ๆ (merge_new_posts.py, patch_alive_from_report.py) ผูกกับรูปแบบ
// `const XBEP_COLLECTION = [...];` อยู่ — เครื่องมือนี้คงรูปแบบนั้นไว้เสมอ
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const IDX = path.join(ROOT, "index.html");
const JSON_FILE = path.join(ROOT, "collections_merged.json");
const MARKER = "const XBEP_COLLECTION = ";

function readHtmlSide() {
  const html = fs.readFileSync(IDX, "utf8");
  const start = html.indexOf(MARKER);
  if (start < 0) throw new Error("หา '" + MARKER + "' ใน index.html ไม่เจอ");
  const arrStart = html.indexOf("[", start);
  const end = html.indexOf("];", arrStart);
  if (end < 0) throw new Error("หาจุดจบของ array ใน index.html ไม่เจอ");
  const arr = JSON.parse(html.slice(arrStart, end + 1)); // parse ไม่ผ่าน = จุดจบคลาดเคลื่อน ให้ abort
  if (!Array.isArray(arr) || !arr.length) throw new Error("array ใน index.html ว่างหรือไม่ใช่ array");
  return { html, start, end, arr };
}

function readJsonSide() {
  const arr = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  if (!Array.isArray(arr) || !arr.length) throw new Error("collections_merged.json ว่างหรือไม่ใช่ array");
  return arr;
}

function extract() {
  const { arr } = readHtmlSide();
  fs.writeFileSync(JSON_FILE, JSON.stringify(arr, null, 2) + "\n", "utf8");
  console.log("extract: เขียน " + arr.length + " รายการ จาก index.html -> collections_merged.json");
}

function inject() {
  const arr = readJsonSide();
  const literal = JSON.stringify(arr);
  if (literal.includes("];")) throw new Error("ข้อมูลมี '];' ใน string — รูปแบบ marker จะพัง ห้าม inject");
  const { html, start, end, arr: live } = readHtmlSide();
  const next = html.slice(0, start) + MARKER + literal + ";" + html.slice(end + 2);
  if ((next.match(new RegExp(MARKER.replace(/ /g, "\\s*"), "g")) || []).length !== 1) {
    throw new Error("หลังแทนที่พบ marker ไม่ตรงหนึ่งเดียว — ยกเลิกการเขียน");
  }
  if (JSON.stringify(live) === literal) {
    console.log("inject: ข้อมูลสองฝั่งตรงกันอยู่แล้ว ไม่เขียนทับ");
    return;
  }
  fs.writeFileSync(IDX, next, "utf8");
  console.log("inject: เขียน " + arr.length + " รายการ จาก collections_merged.json -> index.html");
}

function check() {
  const a = JSON.stringify(readHtmlSide().arr);
  const b = JSON.stringify(readJsonSide());
  if (a !== b) {
    console.error("check: ข้อมูลใน index.html กับ collections_merged.json ไม่ตรงกัน — รัน extract หรือ inject เพื่อซิงก์");
    process.exit(1);
  }
  console.log("check: สองฝั่งตรงกัน (" + JSON.parse(a).length + " รายการ)");
}

const cmd = process.argv[2];
if (cmd === "extract") extract();
else if (cmd === "inject") inject();
else if (cmd === "check") check();
else {
  console.error("ใช้: node tools/collection_data.js extract|inject|check");
  process.exit(1);
}
