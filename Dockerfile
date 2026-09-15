# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src
COPY public/ ./public
RUN npm run build

# Stage 2: Production
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "dist/server.js"]
