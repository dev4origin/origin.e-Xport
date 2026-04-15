const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = 'c:\\Users\\NOGBOU\\Documents\\develop\\origin.e-One\\docs\\ccc_api\\IdxRecepjournalier (3).xls';

try {
    const buf = fs.readFileSync(FILE_PATH);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Header 1 means array of arrays

    console.log("Total Rows:", json.length);
    console.log("--- First 15 Rows ---");
    json.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

} catch (e) {
    console.error("Error:", e);
}
