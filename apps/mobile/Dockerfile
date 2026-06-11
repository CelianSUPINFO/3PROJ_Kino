FROM node:22-bookworm-slim

WORKDIR /app

ENV EXPO_NO_TELEMETRY=1

RUN npm install --global @expo/ngrok@4.1.3

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 8081

CMD ["npx", "expo", "start", "--tunnel", "--go"]
