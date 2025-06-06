require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { OpenAI } = require('openai');
const ffmpeg = require('fluent-ffmpeg');
const fsPromises = require('fs').promises;
const app = express();
const port = process.env.PORT || 3000;

// 加入這段設定
try {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    
    console.log('✅ FFmpeg 路徑設定成功');
} catch (error) {
    console.error('❌ FFmpeg 設定失敗:', error.message);
}

//console.log("API 金鑰：", process.env.OPENAI_API_KEY);

// 配置
const TEACHER_PASSWORD = '0000'; // 預設教師密碼
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const EXPERIMENTS_FILE = path.join(__dirname, 'data', 'experiments.json');

// 確保必要的目錄存在
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}
if (!fs.existsSync(path.dirname(EXPERIMENTS_FILE))) {
    fs.mkdirSync(path.dirname(EXPERIMENTS_FILE));
}
if (!fs.existsSync(EXPERIMENTS_FILE)) {
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify([]));
}

// 中間件
app.use(express.json());
app.use(express.static('public'));

// 配置 multer 用於文件上傳
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// 初始化 OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 讀取實驗數據
function readExperiments() {
    return JSON.parse(fs.readFileSync(EXPERIMENTS_FILE));
}

// 保存實驗數據
function saveExperiments(experiments) {
    fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(experiments, null, 2));
}

// API 路由
// 教師登入
app.post('/api/teacher/login', (req, res) => {
    const { password } = req.body;
    if (password === TEACHER_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: '密碼錯誤' });
    }
});

// 獲取所有實驗
app.get('/api/experiments', (req, res) => {
    const experiments = readExperiments();
    res.json(experiments);
});

// 獲取單個實驗
app.get('/api/experiments/:id', (req, res) => {
    const experiments = readExperiments();
    const experiment = experiments.find(exp => exp.id === req.params.id);
    if (experiment) {
        res.json(experiment);
    } else {
        res.status(404).json({ message: '實驗不存在' });
    }
});

// 新增實驗
app.post('/api/experiments', (req, res) => {
    try {
        console.log('收到新增實驗請求:', req.body);
        
        const experiments = readExperiments();
        const newExperiment = {
            id: Date.now().toString(),
            name: req.body.name,
            materials: req.body.materials || [], // 確保 materials 存在
            steps: (req.body.steps || []).map(step => ({
                description: step.description,
                completed: false
            })),
            createdAt: new Date().toISOString()
        };

        console.log('準備保存的實驗數據:', newExperiment);
        
        experiments.push(newExperiment);
        saveExperiments(experiments);
        
        console.log('實驗保存成功');
        res.json(newExperiment);
    } catch (error) {
        console.error('新增實驗失敗:', error);
        res.status(500).json({ 
            message: '新增實驗失敗', 
            error: error.message,
            stack: error.stack 
        });
    }
});

// 更新實驗
app.put('/api/experiments/:id', (req, res) => {
    try {
        console.log('收到更新實驗請求:', {
            id: req.params.id,
            body: req.body
        });
        
        const experiments = readExperiments();
        const index = experiments.findIndex(exp => exp.id === req.params.id);
        
        if (index !== -1) {
            const updatedExperiment = {
                ...experiments[index],
                name: req.body.name,
                materials: req.body.materials || experiments[index].materials,
                steps: (req.body.steps || []).map(step => ({
                    description: step.description,
                    completed: step.completed || false
                })),
                updatedAt: new Date().toISOString()
            };

            console.log('準備更新的實驗數據:', updatedExperiment);
            
            experiments[index] = updatedExperiment;
            saveExperiments(experiments);
            
            console.log('實驗更新成功');
            res.json(updatedExperiment);
        } else {
            console.log('找不到要更新的實驗:', req.params.id);
            res.status(404).json({ message: '實驗不存在' });
        }
    } catch (error) {
        console.error('更新實驗失敗:', error);
        res.status(500).json({ 
            message: '更新實驗失敗', 
            error: error.message,
            stack: error.stack 
        });
    }
});

// 刪除實驗
app.delete('/api/experiments/:id', (req, res) => {
    const experiments = readExperiments();
    const filteredExperiments = experiments.filter(exp => exp.id !== req.params.id);
    if (filteredExperiments.length !== experiments.length) {
        saveExperiments(filteredExperiments);
        res.json({ success: true });
    } else {
        res.status(404).json({ message: '實驗不存在' });
    }
});

// 處理學生提問
app.post('/api/ask', async (req, res) => {
    try {
        const { question, experimentId, currentStep } = req.body;
        
        // 獲取實驗資訊
        const experiments = readExperiments();
        const experiment = experiments.find(exp => exp.id === experimentId);
        
        if (!experiment) {
            return res.status(404).json({ message: '實驗不存在' });
        }

        // 調用 OpenAI API 來回答問題
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `你是一個專業的科學實驗助手，負責回答學生在進行科學實驗時的問題。
                    當前實驗：${experiment.name}
                    當前步驟：${currentStep}
                    請用簡單易懂的語言回答，並確保答案準確且適合小學生理解。
                    如果問題與實驗步驟無關，請禮貌地引導學生回到實驗主題。`
                },
                {
                    role: "user",
                    content: question
                }
            ]
        });

        res.json({ 
            text: completion.choices[0].message.content,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('處理提問失敗:', error);
        res.status(500).json({ message: '處理提問失敗' });
    }
});

// 將影片轉換為音訊
async function convertVideoToAudio(videoPath) {
    const audioPath = videoPath.replace(/\.[^/.]+$/, '.mp3');
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .toFormat('mp3')
            .on('end', () => resolve(audioPath))
            .on('error', reject)
            .save(audioPath);
    });
}

// 修正後的音訊轉錄函數 - 包含標點符號
async function transcribeAudio(audioPath, onMessage = null) {
    // 輔助函數：同時顯示在 console 和網頁
    const logMessage = (message, type = 'info') => {
        console.log(message);
        if (onMessage) {
            onMessage(message, type);
        }
    };

    try {
        // 檢查檔案是否存在
        if (!fs.existsSync(audioPath)) {
            throw new Error(`音訊檔案不存在: ${audioPath}`);
        }

        // 檢查檔案大小（OpenAI 限制 25MB）
        const stats = fs.statSync(audioPath);
        const sizeMessage = `音訊檔案大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`;
        logMessage(sizeMessage, 'info');
        
        if (stats.size > 25 * 1024 * 1024) {
            throw new Error('音訊檔案太大，超過 25MB 限制');
        }

        logMessage('🔄 開始轉錄音訊...', 'info');

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-1",
            language: "zh",
            response_format: "verbose_json",
            timestamp_granularities: ["word"]
        });

        logMessage('✅ 音訊轉錄成功', 'success');
        
        return transcription.text;
        
    } catch (error) {
        const errorMessage = `❌ 音訊轉錄失敗: ${error.message}`;
        logMessage(errorMessage, 'error');
        throw error;
    }
}

// 上傳影片並生成步驟

// 輔助函數：解析 AI 生成的實驗說明內容
function parseAiResponse(responseText) {
    const result = {
        name: '未命名實驗',
        materials: [],
        steps: []
    };

    // 使用正規表達式匹配各個區塊標題及其內容
    // (?=...) 是正向先行斷言，確保我們在下一個標題或字串結尾前停止匹配
    const sectionsRegex = /(實驗名稱|實驗材料|實驗步驟)：\s*([\s\S]*?)(?=(實驗名稱|實驗材料|實驗步驟)：|$)/g;

    let match;
    while ((match = sectionsRegex.exec(responseText)) !== null) {
        const header = match[1]; // 匹配到的區塊標題 (例如 "實驗名稱")
        let content = match[2].trim(); // 匹配到的區塊內容

        switch (header) {
            case '實驗名稱':
                // 實驗名稱通常是單行
                result.name = content.split('\n')[0].trim();
                break;
            case '實驗材料':
                result.materials = content.split('\n')
                    .filter(line => line.trim().startsWith('-')) // 只保留以 '-' 開頭的行
                    .map(line => line.replace('-', '').trim()); // 移除 '-'
                break;
            case '實驗步驟':
                result.steps = content.split('\n')
                    .filter(line => line.trim().match(/^\d+\./)) // 只保留以數字開頭的行 (步驟編號)
                    .map(line => {
                        const parts = line.split('完成標準：');
                        return {
                            description: parts[0].replace(/^\d+\./, '').trim(), // 移除編號
                            completionStandard: parts[1] ? parts[1].trim() : '完成該步驟', // 處理完成標準
                            completed: false
                        };
                    });
                break;
            // 移除 '安全注意事項' 和 '預期結果' 的處理
        }
    }
    return result;
}

// ---

// 上傳影片並生成步驟的 API 路由
// app 為 Express 應用程式實例
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
    let audioPath = null; // 初始化為 null，以便在 finally 區塊中檢查

    try {
        if (!req.file) {
            return res.status(400).json({ message: '未上傳影片文件' });
        }

        // 轉換影片為音訊
        // req.file.path 是 Multer 儲存的臨時影片路徑
        audioPath = await convertVideoToAudio(req.file.path);

        // 使用 Whisper 轉換音訊為文字
        const transcript = await transcribeAudio(audioPath);

        // 使用 OpenAI API 分析內容
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // 使用適合的 GPT 模型
            messages: [
                {
                    role: "system",
                    content: `你是一個專業的科學實驗分析助手。請根據以下逐字稿，生成詳細的實驗說明。
                    要求：
                    1. 使用簡單易懂的語言
                    2. 每個步驟要具體且可操作
                    3. 適合小學生理解
                    4. 步驟要按順序編號
                    5. 每個步驟都要有明確的完成標準`
                },
                {
                    role: "user",
                    content: `以下是實驗影片的逐字稿：

                    ${transcript}

                    請根據逐字稿生成以下格式的內容：

                    實驗名稱：[實驗名稱]

                    實驗材料：
                    - [材料1]
                    - [材料2]
                    ...

                    實驗步驟：
                    1. [步驟1描述]
                    完成標準：[如何確認步驟1完成]

                    2. [步驟2描述]
                    完成標準：[如何確認步驟2完成]
                    ...`
                    // 移除 '安全注意事項' 和 '預期結果' 的提示
                }
            ]
        });

        // 解析 AI 回應，使用更健壯的函數
        const responseContent = completion.choices[0].message.content;
        const parsedExperiment = parseAiResponse(responseContent);

        // 保存實驗數據
        const experiments = readExperiments();
        const newExperiment = {
            id: Date.now().toString(),
            name: parsedExperiment.name,
            materials: parsedExperiment.materials,
            steps: parsedExperiment.steps.map(step => ({
                description: step.description,
                completed: false
            })),
            videoFile: req.file.filename,
            transcript: transcript,
            createdAt: new Date().toISOString()
        };
        experiments.push(newExperiment);
        saveExperiments(experiments);

        res.json({
            success: true,
            experiment: newExperiment
        });

    } catch (error) {
        console.error('影片處理失敗:', error);
        res.status(500).json({ message: '影片處理失敗' });
    } finally {
        // 無論成功或失敗，都嘗試清理臨時音訊檔案
        if (audioPath) {
            try {
                await fsPromises.unlink(audioPath);
                console.log(`臨時音訊檔案已清理: ${audioPath}`);
            } catch (cleanupError) {
                console.error(`清理臨時音訊檔案失敗 (${audioPath}):`, cleanupError);
            }
        }
    }
});

// 定義字型路徑 - 加入調試資訊
const fontPath = path.join(__dirname, 'fonts', 'NotoSansTC-Regular.ttf');

// 調試：印出路徑資訊
//console.log('🔍 當前工作目錄：', __dirname);
//console.log('🔍 字型完整路徑：', fontPath);
//console.log('🔍 字型檔案是否存在：', fs.existsSync(fontPath));

// 導出 PDF
app.post('/api/export-pdf', (req, res) => {
    try {
        const { experimentId, steps, qaHistory } = req.body;
        
        // 輸入驗證
        if (!experimentId || !steps || !qaHistory) {
            return res.status(400).json({ message: '缺少必要參數' });
        }

        const experiments = readExperiments();
        const experiment = experiments.find(exp => exp.id === experimentId);

        if (!experiment) {
            return res.status(404).json({ message: '實驗不存在' });
        }

        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            bufferPages: true // 重要：確保 PDF 完整生成
        });

        // 設定字型（支援中文）
        if (fs.existsSync(fontPath)) {
            doc.font(fontPath);
        } else {
            console.warn('⚠️  字型檔案不存在，使用預設字型');
            // 不要因為字型問題就停止生成 PDF
        }

        // 清理檔名，移除特殊字符
        const sanitizedName = experiment.name.replace(/[^\w\u4e00-\u9fff\s-]/g, '').trim() || '實驗記錄';
        const filename = `${sanitizedName}_實驗記錄.pdf`;
        
        // 設定回應標頭
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        // 移除 Content-Length，讓 Node.js 自動處理
        
        // 錯誤處理
        doc.on('error', err => {
            console.error('PDF 生成錯誤：', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'PDF 生成失敗' });
            }
        });

        // 確保 pipe 在設定內容之前
        doc.pipe(res);

        // 標題
        doc.fontSize(24)
           .text(experiment.name || '未命名實驗', { align: 'center' })
           .moveDown(2);

        // 實驗步驟
        if (steps && steps.length > 0) {
            doc.fontSize(18)
               .text('實驗步驟', { align: 'left' })
               .moveDown(1);

            steps.forEach((step, index) => {
                if (step && step.description) {
                    doc.fontSize(12)
                       .text(`${index + 1}. ${step.description}`, { align: 'left' })
                       .moveDown(0.5);
                }
            });
        }

        // 問答記錄
        if (qaHistory && qaHistory.length > 0) {
            doc.moveDown(1);
            doc.fontSize(18)
               .text('問答記錄', { align: 'left' })
               .moveDown(1);

            qaHistory.forEach(item => {
                if (item && item.text) {
                    doc.fontSize(12)
                       .text(`${item.type === 'question' ? '問：' : '答：'} ${item.text}`, { align: 'left' })
                       .moveDown(0.5);
                }
            });
        }

        // 重要：確保 PDF 完成後才結束
        doc.end();
        
    } catch (error) {
        console.error('PDF 導出錯誤：', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'PDF 生成失敗', error: error.message });
        }
    }
});

// 教師頁面路由
app.get('/teacher', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// 啟動服務器
app.listen(port, () => {
    console.log(`服務器運行在 http://localhost:${port}`);
});
