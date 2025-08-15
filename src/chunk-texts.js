function chunkTexts(text, chunkSize = 1000, overlapSize = 200) {
  const chunks = [];
  
  // Nếu text là array, join lại thành một string
  if (Array.isArray(text)) {
    text = text.join('\n');
  }
  
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += chunkSize - overlapSize; // Move forward by chunkSize minus overlap
  }

  return chunks;
}

/*const chunkSize = 1000; // Adjust based on your embedding model's token limit
const overlapSize = 200; // Overlap size for context preservation
const chunks = chunkText(pdfText, chunkSize, overlapSize);*/

module.exports = {
  chunkTexts
}