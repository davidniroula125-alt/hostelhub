#!/usr/bin/env bash
set -euo pipefail

mkdir -p /data/db /var/log/mongodb

echo "[entrypoint] starting mongod..."
mongod --dbpath /data/db --replSet rs0 --bind_ip 127.0.0.1 --port 27017 \
  --wiredTigerCacheSizeGB 0.25 --maxConns 100 \
  --logpath /var/log/mongodb/mongod.log --fork

echo "[entrypoint] preparing replica set..."
node /app/docker/init-replset.js

echo "[entrypoint] starting HostelHub..."
exec npm start
