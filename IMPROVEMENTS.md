# Cải Thiện Hệ Thống RAG

## Vấn Đề Ban Đầu

Hệ thống RAG trước đây có những vấn đề sau:
- **Chia nhỏ văn bản đơn giản**: Chỉ cắt theo ký tự, không quan tâm đến ngữ nghĩa
- **Tìm kiếm chunks kém hiệu quả**: Chỉ dựa trên từ khóa đơn giản
- **Prompt không tối ưu**: Không có hướng dẫn cụ thể về cách tổng hợp thông tin
- **Câu trả lời thiếu tự nhiên**: Có vẻ như copy-paste từ chunks

## Các Cải Thiện Đã Thực Hiện

### 1. Cải Thiện Chia Nhỏ Văn Bản (`chunk-texts.js`)

**Trước:**
```javascript
// Chỉ cắt theo ký tự
const chunk = text.slice(start, end);
```

**Sau:**
```javascript
// Chia theo đoạn văn và câu
const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
```

**Lợi ích:**
- Giữ nguyên ngữ nghĩa của văn bản
- Chunks có cấu trúc logic hơn
- Overlap thông minh giữa các chunks

### 2. Cải Thiện Tìm Kiếm Chunks (`server.js`)

**Trước:**
```javascript
// Tìm kiếm đơn giản
relevantChunks = restaurantChunks.filter(chunk => {
  return chunkLower.includes(word);
});
```

**Sau:**
```javascript
// Hệ thống tính điểm relevance
const scoredChunks = restaurantChunks.map(chunk => {
  let score = 0;
  // Điểm cho từ khóa chính xác
  // Điểm cho từ quan trọng
  // Điểm bonus cho thông tin cụ thể
  return { chunk, score };
});
```

**Lợi ích:**
- Tìm kiếm chính xác hơn
- Ưu tiên chunks có thông tin liên quan
- Loại bỏ chunks không liên quan

### 3. Cải Thiện Prompt và Xử Lý Context (`generate-answer.js`)

**Trước:**
```javascript
systemMessage = `You are an AI that answers questions strictly based on your knowledge...`;
```

**Sau:**
```javascript
systemMessage = `Bạn là một trợ lý AI thông minh và hữu ích. Hãy trả lời câu hỏi dựa trên thông tin được cung cấp với các nguyên tắc sau:

1. **Chính xác**: Chỉ sử dụng thông tin có trong context được cung cấp
2. **Tự nhiên**: Trả lời một cách tự nhiên, mượt mà như đang nói chuyện
3. **Đầy đủ**: Cung cấp thông tin đầy đủ nhưng không thừa
4. **Cấu trúc**: Tổ chức thông tin một cách logic và dễ hiểu
5. **Ngắn gọn**: Trả lời ngắn gọn nhưng đầy đủ thông tin cần thiết`;
```

**Lợi ích:**
- Câu trả lời tự nhiên hơn
- Cấu trúc rõ ràng
- Giọng điệu thân thiện

### 4. Thêm Hệ Thống Trích Xuất Từ Khóa

```javascript
function extractKeywords(question) {
  const keywords = [];
  
  // Từ khóa về địa chỉ
  if (question.includes('địa chỉ') || question.includes('ở đâu')) {
    keywords.push('địa chỉ', 'cơ sở', 'hoàng quán chi');
  }
  
  // Từ khóa về liên hệ
  if (question.includes('số điện thoại') || question.includes('hotline')) {
    keywords.push('hotline', 'zalo', '0382', '0365');
  }
  
  return keywords;
}
```

**Lợi ích:**
- Hiểu ý định câu hỏi tốt hơn
- Tìm kiếm chính xác hơn
- Xử lý ngôn ngữ tự nhiên

### 5. Cải Thiện Xử Lý Context

```javascript
function processContextChunks(chunks) {
  // Loại bỏ chunks trùng lặp hoặc quá ngắn
  const filteredChunks = chunks
    .filter(chunk => chunk && chunk.trim().length > 10)
    .map(chunk => chunk.trim());

  // Loại bỏ trùng lặp
  const uniqueChunks = [...new Set(filteredChunks)];

  // Sắp xếp theo độ liên quan
  const sortedChunks = uniqueChunks.sort((a, b) => b.length - a.length);

  // Giới hạn số lượng chunks
  const selectedChunks = sortedChunks.slice(0, 5);

  return selectedChunks.join('\n\n');
}
```

**Lợi ích:**
- Loại bỏ thông tin trùng lặp
- Tối ưu độ dài context
- Cải thiện hiệu suất

## Kết Quả Mong Đợi

Sau các cải thiện này, hệ thống sẽ:

1. **Câu trả lời tự nhiên hơn**: Không còn như copy-paste từ chunks
2. **Chính xác hơn**: Tìm kiếm thông tin liên quan tốt hơn
3. **Đầy đủ thông tin**: Không thiếu hoặc thừa thông tin
4. **Mượt mà**: Giọng điệu thân thiện, chuyên nghiệp
5. **Hiệu quả**: Xử lý nhanh hơn với context tối ưu

## Cách Test

Chạy file test để kiểm tra cải thiện:

```bash
node test-improvements.js
```

## Lưu Ý

- Cần có API key OpenAI hợp lệ
- Có thể điều chỉnh các tham số như `temperature`, `maxTokens` để phù hợp với nhu cầu
- Có thể thêm các từ khóa mới vào hàm `extractKeywords` để cải thiện tìm kiếm
