# The server image for DigitalOcean App Platform. Build from the repo root:
#   docker build -f apps/server/Dockerfile -t lockwords-server .
FROM node:22-slim
WORKDIR /app

# Install only the server's packages (the lock file covers the whole repo).
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci -w @lockwords/server --ignore-scripts --fetch-retries=6 --fetch-timeout=600000

COPY apps/server apps/server
COPY .do/with-db-ca.sh .do/with-db-ca.sh
RUN npm run build -w @lockwords/server

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
USER node
# drizzle-kit stays in the image: the "migrate" job runs the migrations with it before each deploy.
ENTRYPOINT ["/app/.do/with-db-ca.sh"]
CMD ["node", "apps/server/dist/index.js"]
