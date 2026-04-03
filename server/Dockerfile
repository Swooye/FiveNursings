# 使用 Node 20 镜像
FROM node:20-slim

# 设置工作目录
WORKDIR /usr/src/app

# 拷贝依赖定义
# 注意：在 Cloud Run --source 模式下，如果只部署 server 目录，
# 这里的 package*.json 应该存在于该目录中。
COPY package*.json ./

# 安装生产依赖
# 使用 npm install 而非 npm ci，因为在 Monorepo 子目录中可能缺少最新的 lockfile
RUN npm install --omit=dev

# 拷贝源代码
COPY . .

# 暴露端口（与 index.js 中的 process.env.PORT 对应）
EXPOSE 3002

# 启动服务
CMD [ "node", "index.js" ]
