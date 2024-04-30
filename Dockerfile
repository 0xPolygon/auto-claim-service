FROM node:21
WORKDIR /app
RUN apt-get update || : && apt-get install -y \
    python3 \
    build-essential \
    libsasl2-dev \
    libsasl2-modules \
    libssl-dev \
    git 
COPY . .
RUN npm install
RUN npm run build
WORKDIR /app
CMD ["node", "dist/index.js"]
