function chunkTexts(text, chunkSize = 1000, overlapSize = 200) {
  const chunks = [];
  
  // Nếu text là array, join lại thành một string
  if (Array.isArray(text)) {
    text = text.join('\n');
  }
  
  // Tách văn bản thành các đoạn dựa trên dấu xuống dòng
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkCount = 0;
  
  for (const paragraph of paragraphs) {
    // Nếu đoạn văn quá dài, tách theo câu
    if (paragraph.length > chunkSize) {
      // Tách theo dấu câu
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
            chunkCount++;
          }
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
    } else {
      // Nếu thêm đoạn văn này vượt quá chunkSize
      if ((currentChunk + paragraph).length > chunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          chunkCount++;
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + paragraph;
      }
    }
  }
  
  // Thêm chunk cuối cùng
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Thêm overlap giữa các chunks
  const chunksWithOverlap = [];
  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];
    
    // Thêm overlap từ chunk trước
    if (i > 0 && overlapSize > 0) {
      const prevChunk = chunks[i - 1];
      const overlapText = prevChunk.slice(-overlapSize);
      chunk = overlapText + '\n' + chunk;
    }
    
    // Thêm overlap cho chunk sau
    if (i < chunks.length - 1 && overlapSize > 0) {
      const nextChunk = chunks[i + 1];
      const overlapText = nextChunk.slice(0, overlapSize);
      chunk = chunk + '\n' + overlapText;
    }
    
    chunksWithOverlap.push(chunk);
  }
  
  return chunksWithOverlap;
}

/*const chunkSize = 1000; // Adjust based on your embedding model's token limit
const overlapSize = 200; // Overlap size for context preservation
const chunks = chunkText(pdfText, chunkSize, overlapSize);*/

module.exports = {
  chunkTexts
}