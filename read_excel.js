const xlsx = require('xlsx'); 
const wb = xlsx.readFile('Stock list  and pricing (1).xlsx'); 
const ws = wb.Sheets[wb.SheetNames[0]]; 
const data = xlsx.utils.sheet_to_json(ws, {header: 1}); 
console.log("Row 1:", data[0]); 
console.log("Row 2:", data[1]);
