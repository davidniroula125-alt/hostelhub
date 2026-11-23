#!/usr/bin/env bash
set -euo pipefail

mkdir -p /data/db /var/log/mongodb
touch /var/log/mongodb/mongod.log
tail -n +1 -f /var/log/mongodb/mongod.log &
LOG_TAIL_PID=$!

mongod_alive() {
  for d in /proc/[0-9]*; do
    if [ "$(cat "$d/comm" 2>/dev/null)" = "mongod" ]; then return 0; fi
  done
  return 1
}

dump_log() {
  echo "[entrypoint] ==== mongod log (last 100 lines) ===="
  tail -n 100 /var/log/mongodb/mongod.log || true
  echo "[entrypoint] ==== end mongod log ===="
}

echo "[entrypoint] starting mongod..."
mongod --dbpath /data/db --replSet rs0 --bind_ip 127.0.0.1 --port 27017 \
  --wiredTigerCacheSizeGB 0.25 --maxConns 100 \
  --logpath /var/log/mongodb/mongod.log --fork

echo "[entrypoint] waiting for mongod port..."
port_open=0
for i in $(seq 1 30); do
  if ! mongod_alive; then
    echo "[entrypoint] mongod process died"
    break
  fi
  if (exec 3<>/dev/tcp/127.0.0.1/27017) 2>/dev/null; then
    port_open=1
    echo "[entrypoint] mongod port is open"
    break
  fi
  sleep 1
done

if [ "$port_open" != "1" ]; then
  dump_log
  exit 1
fi

echo "[entrypoint] preparing replica set..."
if ! node /app/docker/init-replset.js; then
  dump_log
  exit 1
fi

kill "$LOG_TAIL_PID" 2>/dev/null || true

echo "[entrypoint] starting HostelHub..."
exec npm start
