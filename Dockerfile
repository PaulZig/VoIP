# Build the frontend. Its webpack 3 toolchain does not run on current Node
# (OpenSSL 3), so this stage alone uses Node 16.
FROM node:16-alpine AS frontend

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./

# install scripts only fetch test browsers and build unused native addons
RUN npm ci --ignore-scripts --legacy-peer-deps

COPY frontend/ ./

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY app.js config.js version.md robots.txt ./
COPY app ./app
COPY config ./config
COPY error ./error
COPY --from=frontend /frontend/dist ./frontend/dist

RUN mkdir -p uploads

EXPOSE 8080

CMD ["node", "app.js"]
