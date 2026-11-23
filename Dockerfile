FROM node:20-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm install --include=dev
COPY client ./client
COPY server ./server
RUN npm run build

FROM node:20-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-7.0.gpg \
  && echo "deb [ arch=amd64 signed-by=/usr/share/keyrings/mongodb-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" > /etc/apt/sources.list.d/mongodb-org-7.0.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends mongodb-org-server \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app /app
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/init-replset.js /app/docker/init-replset.js
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
EXPOSE 10000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
