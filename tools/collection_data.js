#!/usr/bin/env node
// ซิงก์ข้อมูลคลัง XBep ระหว่าง collections_merged.json กับโมดูลข้อมูลที่หน้าเว็บโหลด
// ใช้: node tools/collection_data.js extract | inject | check
//
//   extract  collections-data.js → collections_merged.json
//   inject   collections_merged.json → collections-data.js
//   check    เทียบสองฝั่ง ต่างกันให้ exit 1           (ใช้ใน CI / สคริปต์ประจำวันได้)
//
// คงรูปแบบ `const XBEP_COLLECTION = [...];` ไว้เพื่อให้สคริปต์บำรุงข้อมูลแก้ array ได้
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_FILE = path.join(ROOT, "collections-data.js");
const JSON_FILE = path.join(ROOT, "collections_merged.json");
const MARKER = "const XBEP_COLLECTION = ";

function readDataSide() {
  const source = fs.readFileSync(DATA_FILE, "utf8");
  const start = source.indexOf(MARKER);
  if (start < 0) throw new Error("หา '" + MARKER + "' ใน collections-data.js ไม่เจอ");
  const arrStart = source.indexOf("[", start);
  const end = source.indexOf("];", arrStart);
  if (end < 0) throw new Error("หาจุดจบของ array ใน collections-data.js ไม่เจอ");
  const arr = JSON.parse(source.slice(arrStart, end + 1));
  if (!Array.isArray(arr) || !arr.length) throw new Error("array ใน collections-data.js ว่างหรือไม่ใช่ array");
  return { source, start, end, arr };
}

function readJsonSide() {
  const arr = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  if (!Array.isArray(arr) || !arr.length) throw new Error("collections_merged.json ว่างหรือไม่ใช่ array");
  return arr;
}

function extract() {
  const { arr } = readDataSide();
  fs.writeFileSync(JSON_FILE, JSON.stringify(arr, null, 2) + "\n", "utf8");
  console.log("extract: เขียน " + arr.length + " รายการ จาก collections-data.js -> collections_merged.json");
}

function inject() {
  const arr = readJsonSide();
  const literal = JSON.stringify(arr);
  if (literal.includes("];")) throw new Error("ข้อมูลมี '];' ใน string — รูปแบบ marker จะพัง ห้าม inject");
  const { source, start, end, arr: live } = readDataSide();
  const next = source.slice(0, start) + MARKER + literal + ";" + source.slice(end + 2);
  if ((next.match(new RegExp(MARKER.replace(/ /g, "\\s*"), "g")) || []).length !== 1) {
    throw new Error("หลังแทนที่พบ marker ไม่ตรงหนึ่งเดียว — ยกเลิกการเขียน");
  }
  if (JSON.stringify(live) === literal) {
    console.log("inject: ข้อมูลสองฝั่งตรงกันอยู่แล้ว ไม่เขียนทับ");
    return;
  }
  fs.writeFileSync(DATA_FILE, next, "utf8");
  console.log("inject: เขียน " + arr.length + " รายการ จาก collections_merged.json -> collections-data.js");
}

function check() {
  const a = JSON.stringify(readDataSide().arr);
  const b = JSON.stringify(readJsonSide());
  if (a !== b) {
    console.error("check: ข้อมูลใน collections-data.js กับ collections_merged.json ไม่ตรงกัน — รัน extract หรือ inject เพื่อซิงก์");
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
