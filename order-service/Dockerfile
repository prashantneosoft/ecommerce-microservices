# 1️⃣ Base image
FROM node:18-alpine

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Copy dependency files first (better caching)
COPY package*.json ./

# 4️⃣ Install dependencies
RUN npm ci --only=production

# 5️⃣ Copy source code
COPY . .

# 6️⃣ Expose port (actual value comes from ENV)
EXPOSE 4003

# 7️⃣ Start service
CMD ["node", "src/index.js"]
