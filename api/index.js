const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { chunkTexts } = require('../src/chunk-texts');
const { embedTexts } = require('../src/embed-texts');
const { generateAnswer } = require('../src/generate-answer');
const { extractTextsFromPDF } = require('../src/parse-pdf');
const { checkIndexExists, createIndex, describeIndexStats, retrieveRelevantChunks, storeEmbeddings } = require('../src/vector-db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Multer configuration for file upload (memory storage for serverless)
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed!'), false);
    }
  }
});

// Initialize database
const initDatabase = async () => {
  const indexExists = await checkIndexExists();
  console.log('Index exists:', indexExists);
  if (!indexExists) {
    await createIndex();
    console.log('Database index created');
  } else {
    const indexStats = await describeIndexStats();
    console.log('Index stats:', indexStats);
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'RAG API is running' });
});

// Get list of available files (simplified for serverless)
app.get('/api/pdfs', (req, res) => {
  try {
    // For serverless, we'll return a default list since file system is read-only
    res.json({ 
      pdfs: ['nguquan-info.txt'],
      message: 'Serverless mode - using default restaurant data'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get file list' });
  }
});

// Upload PDF (simplified for serverless)
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // In serverless, we can't save files permanently
    // We'll process the file directly from memory
    res.json({ 
      message: 'File uploaded successfully (serverless mode)',
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload TXT (simplified for serverless)
app.post('/api/upload-txt', upload.single('txt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No TXT file uploaded' });
    }

    // In serverless, we can't save files permanently
    res.json({ 
      message: 'TXT uploaded successfully (serverless mode)',
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process PDF (extract text, chunk, embed, store)
app.post('/api/process-pdf', async (req, res) => {
  try {
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
      chunks: pdfChunks.length,
      embeddings: embeddings.length
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process TXT (read text, chunk, embed, store)
app.post('/api/process-txt', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    console.log('Processing TXT:', filePath);
    
    // Read text from TXT file
    const txtContent = fs.readFileSync(filePath, 'utf8');
    
    // Chunk the text
    const txtChunks = chunkTexts(txtContent);
    
    // Generate embeddings
    const embeddings = await embedTexts(txtChunks);
    
    // Store in vector database
    await storeEmbeddings(embeddings);
    
    res.json({ 
      message: 'TXT processed successfully',
      chunks: txtChunks.length,
      embeddings: embeddings.length
    });
  } catch (error) {
    console.error('Error processing TXT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ask question
app.post('/api/ask', async (req, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('Question:', question, 'Context:', context);
    
    let relevantChunks = [];
    
    // Mặc định sử dụng dữ liệu nhà hàng từ nguquan-info.txt
    const restaurantDataPath = path.join(__dirname, '../pdfs/nguquan-info.txt');
    if (fs.existsSync(restaurantDataPath)) {
      const restaurantText = fs.readFileSync(restaurantDataPath, 'utf8');
      const restaurantChunks = chunkTexts(restaurantText, 200, 50);
      
      // Tìm chunks liên quan dựa trên từ khóa trong câu hỏi
      const questionLower = question.toLowerCase();
      
      // Logic RAG đơn giản: tìm chunks có chứa từ khóa trong câu hỏi
      relevantChunks = restaurantChunks.filter(chunk => {
        const chunkLower = chunk.toLowerCase();
        
        // Kiểm tra xem chunk có chứa toàn bộ câu hỏi không
        if (chunkLower.includes(questionLower)) {
          return true;
        }
        
        // Kiểm tra từng từ trong câu hỏi
        const words = questionLower.split(' ').filter(word => word.length > 1);
        for (const word of words) {
          if (chunkLower.includes(word)) {
            return true;
          }
        }
        return false;
      });
      
      // Nếu không tìm thấy, lấy 3 chunks đầu tiên
      if (relevantChunks.length === 0) {
        relevantChunks = restaurantChunks.slice(0, 3);
      }
      
      // Giới hạn số lượng chunks để tránh quá dài
      if (relevantChunks.length > 5) {
        relevantChunks = relevantChunks.slice(0, 5);
      }
    } else {
      // Fallback: sử dụng dữ liệu PDF/TXT thông thường nếu không có file nguquan-info.txt
      relevantChunks = await retrieveRelevantChunks(question);
    }
    
    if (relevantChunks.length === 0) {
      if (fs.existsSync(restaurantDataPath)) {
        return res.json({ 
          answer: 'Xin lỗi, tôi không có thông tin về câu hỏi này. Vui lòng liên hệ hotline: 0382 699 866 để được hỗ trợ trực tiếp.',
          chunks: []
        });
      } else {
        return res.json({ 
          answer: 'Không tìm thấy thông tin liên quan trong tài liệu. Vui lòng thử câu hỏi khác hoặc xử lý file trước.',
          chunks: []
        });
      }
    }
    
    // Generate answer mặc định sử dụng prompt nhà hàng
    let answer;
    if (fs.existsSync(restaurantDataPath)) {
      answer = await generateRestaurantAnswer(question, relevantChunks);
    } else {
      answer = await generateAnswer(question, relevantChunks);
    }
    
    res.json({ 
      answer,
      chunks: relevantChunks,
      question,
      context: context || 'general'
    });
  } catch (error) {
    console.error('Error generating answer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Function để generate answer cho nhà hàng
async function generateRestaurantAnswer(question, relevantChunks) {
  const { generateAnswer } = require('../src/generate-answer');
  
  // Tạo prompt đặc biệt cho nhà hàng
  const restaurantPrompt = `Bạn là trợ lý ảo của nhà hàng Ngư Quán. Hãy trả lời câu hỏi của khách hàng một cách thân thiện và chính xác dựa trên thông tin sau:

${relevantChunks.join('\n\n')}

LƯU Ý QUAN TRỌNG:
- Nếu khách hỏi về địa chỉ, chỉ trả lời địa chỉ cụ thể
- Nếu khách hỏi về hotline, chỉ trả lời số điện thoại
- Nếu khách hỏi về giá, chỉ trả lời thông tin giá
- Nếu khách hỏi về giờ mở cửa, chỉ trả lời thời gian
- KHÔNG tự động chuyển sang chủ đề khác nếu khách không hỏi

Câu hỏi: ${question}`;

  // Sử dụng generateAnswer với prompt đặc biệt
  return await generateAnswer(question, relevantChunks, restaurantPrompt);
}

// Initialize database
const initDatabase = async () => {
  const indexExists = await checkIndexExists();
  console.log('Index exists:', indexExists);
  if (!indexExists) {
    await createIndex();
    console.log('Database index created');
  } else {
    const indexStats = await describeIndexStats();
    console.log('Index stats:', indexStats);
  }
};

// Initialize database on cold start
initDatabase().catch(console.error);

// Export for Vercel
module.exports = app;
