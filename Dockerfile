# 1. 使用 Node.js 环境
FROM node:18-alpine

# 2. 设置工作目录
WORKDIR /app

# 3. 复制依赖并安装
COPY package*.json ./
RUN npm install

# 4. 复制所有代码
COPY . .

# 5. 暴露端口
EXPOSE 8080

# 6. 【关键】使用开发模式启动
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
