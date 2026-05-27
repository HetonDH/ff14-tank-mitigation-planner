import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const files = [
  "C:/Users/huche/Downloads/绝伊甸自制时间轴-正攻击退镜版.xlsx",
  "C:/Users/huche/Downloads/绝欧米茄减伤表 正式版v2.7.xlsx",
  "C:/Users/huche/Downloads/绝欧米茄时间轴及减伤安排表（中日英）2023.2.6更新平a轴与伤害量.xlsx",
  "C:/Users/huche/Downloads/绝龙诗减伤表_纯净版v2.01.xlsx",
  "C:/Users/huche/Downloads/自用绝龙诗奶轴.xlsx",
];

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const workbook = XLSX.readFile(file, { cellDates: false });
  console.log(`Sheets: ${workbook.SheetNames.join(" | ")}`);
  for (const sheetName of workbook.SheetNames.slice(0, 6)) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: false });
    console.log(`\n-- ${sheetName} (${rows.length} rows) --`);
    for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
      const row = rows[i].slice(0, 14).map((cell) => String(cell).replace(/\s+/g, " ").slice(0, 36));
      console.log(`${String(i + 1).padStart(2, "0")}: ${JSON.stringify(row)}`);
    }
  }
}
