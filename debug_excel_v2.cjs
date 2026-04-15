const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = 'c:\\Users\\NOGBOU\\Documents\\develop\\origin.e-One\\docs\\ccc_api\\IdxRecepjournalier (3).xls';

try {
    const buf = fs.readFileSync(FILE_PATH);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Use header:1 to get array of arrays
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    console.log("Total Rows:", json.length);
    console.log("--- First 25 Rows (JSON format) ---");
    json.slice(0, 25).forEach((row, i) => {
        // Print detailed JSON to see nulls and exact strings
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

} catch (e) {
    console.error("Error:", e);
}
