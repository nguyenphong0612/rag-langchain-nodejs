const { ChatOpenAI } = require('@langchain/openai');

// https://js.langchain.com/v0.2/docs/integrations/chat/openai/
// https://js.langchain.com/v0.2/docs/integrations/chat/azure/
async function generateAnswer(query, retrievedChunks, customPrompt = null) {
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3, // Giảm temperature để có câu trả lời ổn định hơn
    maxTokens: 1000, // Giới hạn độ dài câu trả lời
  });

  // Xử lý và tổng hợp context từ các chunks
  const processedContext = processContextChunks(retrievedChunks);
  
  // Giới hạn độ dài context để tránh vượt quá token limit
  const maxContextLength = 4000; // Khoảng 4000 ký tự
  const truncatedContext = processedContext.length > maxContextLength 
    ? processedContext.substring(0, maxContextLength) + '...'
    : processedContext;

  let systemMessage, humanMessage;

  if (customPrompt) {
    // Sử dụng custom prompt nếu được cung cấp
    systemMessage = customPrompt;
    humanMessage = `Thông tin tham khảo:\n${truncatedContext}\n\nCâu hỏi: ${query}`;
  } else {
    // Sử dụng prompt mặc định được cải thiện
    systemMessage = `Bạn là một trợ lý AI thông minh và hữu ích. Hãy trả lời câu hỏi dựa trên thông tin được cung cấp với các nguyên tắc sau:

1. **Chính xác**: Chỉ sử dụng thông tin có trong context được cung cấp
2. **Tự nhiên**: Trả lời một cách tự nhiên, mượt mà như đang nói chuyện
3. **Đầy đủ**: Cung cấp thông tin đầy đủ nhưng không thừa
4. **Cấu trúc**: Tổ chức thông tin một cách logic và dễ hiểu
5. **Ngắn gọn**: Trả lời ngắn gọn nhưng đầy đủ thông tin cần thiết

Nếu thông tin trong context không đủ để trả lời câu hỏi, hãy nói rõ điều đó và đề xuất cách tìm thêm thông tin.`;
    
    humanMessage = `Thông tin tham khảo:\n${truncatedContext}\n\nCâu hỏi: ${query}`;
  }

  try {
    // Invoke the LLM with the system and human messages
    const aiMsg = await llm.invoke([
      ["system", systemMessage],
      ["human", humanMessage],
    ]);

    // Extract the answer from the model's response
    const answer = aiMsg.content.trim();

    return answer;
  } catch (error) {
    console.error('Error generating answer:', error);
    return 'Xin lỗi, tôi gặp lỗi khi xử lý câu hỏi. Vui lòng thử lại sau.';
  }
}

// Hàm xử lý và tổng hợp context từ các chunks
function processContextChunks(chunks) {
  if (!chunks || chunks.length === 0) {
    return '';
  }

  // Loại bỏ các chunks trùng lặp hoặc quá ngắn
  const filteredChunks = chunks
    .filter(chunk => chunk && chunk.trim().length > 10)
    .map(chunk => chunk.trim());

  // Loại bỏ các chunks trùng lặp
  const uniqueChunks = [...new Set(filteredChunks)];

  // Sắp xếp chunks theo độ liên quan (có thể cải thiện thêm)
  const sortedChunks = uniqueChunks.sort((a, b) => {
    // Ưu tiên chunks dài hơn (có thể chứa nhiều thông tin hơn)
    return b.length - a.length;
  });

  // Giới hạn số lượng chunks để tránh context quá dài
  const maxChunks = 5;
  const selectedChunks = sortedChunks.slice(0, maxChunks);

  // Tổng hợp thành một context duy nhất
  return selectedChunks.join('\n\n');
}

//const finalAnswer = await generateAnswer(relevantChunks);
module.exports = {
  generateAnswer
}