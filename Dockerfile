FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci && npm run build -w packages/shared && npm run build -w packages/api && npm prune --omit=dev
COPY bob_sessions/task02b/corrected-records.json ./bob_sessions/task02b/corrected-records.json
ENV NODE_ENV=production
ENV DB_PATH=/data/dcnstrct.db
ENV PORT=3001
EXPOSE 3001
CMD ["node", "packages/api/dist/server.js"]
