const pdfParse = require('pdf-parse');
const fs = require('fs'); // fs - file system 

async function extractTextsFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  return pdfData.text; // Contains the extracted text
}

//const pdfText = await extractTextFromPDF('path/to/your.pdf');

module.exports = {
  extractTextsFromPDF
}