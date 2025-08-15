const { ChatOpenAI } = require('@langchain/openai');

// https://js.langchain.com/v0.2/docs/integrations/chat/openai/
// https://js.langchain.com/v0.2/docs/integrations/chat/azure/
async function generateAnswer(query, retrievedChunks, customPrompt = null) {
  const llm = new ChatOpenAI({
    model: "gpt-4.1-mini",
    // Include any other parameters required, e.g., temperature, max_tokens, etc.
  });

  // Join retrieved chunks into a single context string
  const context = retrievedChunks.join(' ');

  let systemMessage, humanMessage;

  if (customPrompt) {
    // Sử dụng custom prompt nếu được cung cấp
    systemMessage = customPrompt;
    humanMessage = `Context: ${context}\n\nQuestion: ${query}`;
  } else {
    // Sử dụng prompt mặc định
    systemMessage = `You are an AI that answers questions strictly based on your knowledge from chatGPT and the provided context. 
    If the context doesn't contain enough information, respond with "I do not have enough info to answer this question."`;
    humanMessage = `Context: ${context}\n\nQuestion: ${query}`;
  }

  // Invoke the LLM with the system and human messages
  const aiMsg = await llm.invoke([
    ["system", systemMessage],
    ["human", humanMessage],
  ]);

  // Extract the answer from the model's response
  const answer = aiMsg.content.trim();

  return answer;
}

//const finalAnswer = await generateAnswer(relevantChunks);
module.exports = {
  generateAnswer
}