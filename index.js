require('dotenv').config()
const readline = require('readline');

const { chunkTexts } = require('./src/chunk-texts');
const { embedTexts } = require('./src/embed-texts');
const { generateAnswer } = require('./src/generate-answer');
const { extractTextsFromPDF } = require('./src/parse-pdf');
const { checkIndexExists, createIndex, describeIndexStats, retrieveRelevantChunks, storeEmbeddings } = require('./src/vector-db');

const processPdf = async (pdfpath = './pdfs/HUONG_DAN_SU_DUNG_THISINH_DKNV_2025.pdf') => {
  console.log('Processing PDF', pdfpath)
  const pdfTexts = await extractTextsFromPDF(pdfpath);
  const pdfChunks = chunkTexts(pdfTexts);
  const embeddings = await embedTexts(pdfChunks)
  await storeEmbeddings(embeddings);
}

const init = async () => {
  const indexExists = await checkIndexExists();
  console.log('Index exists', indexExists)
  if (!indexExists) {
    await createIndex();
  } else {
    const indexStats = await describeIndexStats()
    console.log('Index stats', indexStats)
  }
  // for a test query, retrieve embeddings
  const query = 'What is GST?'; // it should match processed PDFs
  const relevantChunksMatchingQuery = await retrieveRelevantChunks(query);
  console.log(`Chunks matching for query "${query}"`, relevantChunksMatchingQuery)
  if (!relevantChunksMatchingQuery.length) {
    console.log('No matching chunks found, Need to parse PDF and store embeddings')
    console.log('call processPdf function')
    await processPdf()
  }
}


const main = async () => {
  // Create index and store chunks and embeddings from pdfs/basic-concepts-gst.pdf
  // This will only happen for the first time
  await init();

  // Create an interface for terminal input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Function to prompt the user and handle the query
  const promptUser = () => {
    rl.question('Enter your query (type "quit" to exit): ', async query => {
      if (query.toLowerCase() === 'quit' || query.toLowerCase() === 'exit') {
        console.log('Exiting...');
        rl.close();
        return;
      }

      const relevantChunksMatchingQuery = await retrieveRelevantChunks(query);
      console.log(relevantChunksMatchingQuery)
      const answer = await generateAnswer(query, relevantChunksMatchingQuery);
      // Print the query and answer with different colors
      console.log('-----------------------------------');
      console.log(`Query: ${query}`);
      console.log(`\x1b[31mAnswer: ${answer}\x1b[0m`); // \x1b[31m sets the text color to red, \x1b[0m resets it
      console.log('-----------------------------------');

      // Prompt the user again after answering
      promptUser();
    });
  };

  // Start the loop
  promptUser();
};

// Run the main function
main();
