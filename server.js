require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { chunkTexts } = require('./src/chunk-texts');
const { embedTexts } = require('./src/embed-texts');
const { generateAnswer } = require('./src/generate-answer');
const { extractTextsFromPDF } = require('./src/parse-pdf');
const { checkIndexExists, createIndex, describeIndexStats, retrieveRelevantChunks, storeEmbeddings } = require('./src/vector-db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './pdfs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Initialize the system
let isInitialized = false;

const initializeSystem = async () => {
  if (isInitialized) return;
  
  try {
    const indexExists = await checkIndexExists();
    console.log('Index exists:', indexExists);
    
    if (!indexExists) {
      await createIndex();
      console.log('Index created successfully');
    } else {
      const indexStats = await describeIndexStats();
      console.log('Index stats:', indexStats);
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing system:', error);
    throw error;
  }
};

// API Routes

// Get list of available PDFs
app.get('/api/pdfs', (req, res) => {
  try {
    const pdfDir = './pdfs';
    if (!fs.existsSync(pdfDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(pdfDir)
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => ({
        name: file,
        path: path.join(pdfDir, file)
      }));
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get PDF list' });
  }
});

// Upload new PDF
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    
    res.json({ 
      message: 'PDF uploaded successfully',
      fileName: fileName,
      filePath: filePath
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload PDF' });
  }
});

// Process PDF (extract, chunk, embed, store)
app.post('/api/process-pdf', async (req, res) => {
  try {
    await initializeSystem();
    
    const { pdfPath } = req.body;
    if (!pdfPath) {
      return res.status(400).json({ error: 'PDF path is required' });
    }
    
    console.log('Processing PDF:', pdfPath);
    
    // Extract text from PDF
    const pdfTexts = await extractTextsFromPDF(pdfPath);
    
    // Chunk the text
    const pdfChunks = chunkTexts(pdfTexts);
    
    // Generate embeddings
    const embeddings = await embedTexts(pdfChunks);
    
    // Store in vector database
    await storeEmbeddings(embeddings);
    
    res.json({ 
      message: 'PDF processed successfully',
      chunksCount: pdfChunks.length,
      embeddingsCount: embeddings.length
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    await initializeSystem();
    
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Retrieve relevant chunks
    const relevantChunks = await retrieveRelevantChunks(query);
    
    if (!relevantChunks.length) {
      return res.json({
        answer: "Tôi không tìm thấy thông tin liên quan trong tài liệu. Vui lòng thử câu hỏi khác hoặc tải lên PDF mới.",
        chunks: []
      });
    }
    
    // Generate answer
    const answer = await generateAnswer(query, relevantChunks);
    
    res.json({
      answer: answer,
      chunks: relevantChunks
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

// Get system status
app.get('/api/status', async (req, res) => {
  try {
    const indexExists = await checkIndexExists();
    let indexStats = null;
    
    if (indexExists) {
      indexStats = await describeIndexStats();
    }
    
    res.json({
      initialized: isInitialized,
      indexExists: indexExists,
      indexStats: indexStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Initializing RAG system...');
  initializeSystem().then(() => {
    console.log('RAG system initialized successfully');
  }).catch(error => {
    console.error('Failed to initialize RAG system:', error);
  });
});
