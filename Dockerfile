# 使用 Node.js 官方映像作為基礎
FROM node:18-slim

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# 安裝 Python 依賴
RUN pip3 install --no-cache-dir \
    openai-whisper

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝 Node.js 依賴
RUN npm install

# 複製應用程式代碼
COPY . .

# 創建必要的目錄
RUN mkdir -p uploads data fonts

# 設置環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 啟動應用程式
CMD ["node", "server.js"] 