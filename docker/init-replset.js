const { MongoClient } = require('mongodb');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt++) {
    let client;
    try {
      client = await MongoClient.connect('mongodb://127.0.0.1:27017/?directConnection=true', {
        serverSelectionTimeoutMS: 3000
      });
      const admin = client.db('admin');
      try {
        await admin.command({
          replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] }
        });
        console.log('[init] replica set initiated');
      } catch (e) {
        if (e.code === 23 || /already initialized/i.test(e.message || '')) {
          console.log('[init] replica set already initialized');
        } else {
          throw e;
        }
      }
      for (let i = 0; i < 30; i++) {
        try {
          const status = await admin.command({ replSetGetStatus: 1 });
          if (status.myState === 1) {
            console.log('[init] primary ready');
            await client.close();
            process.exit(0);
          }
        } catch (e) {
          lastError = e;
        }
        await sleep(1000);
      }
      throw new Error('replica set did not become primary in time');
    } catch (e) {
      lastError = e;
      if (client) {
        try {
          await client.close();
        } catch (_) {}
      }
      console.log(`[init] attempt ${attempt} failed: ${e.message}`);
      await sleep(1000);
    }
  }
  console.error('[init] could not initiate replica set:', lastError && lastError.message);
  process.exit(1);
})();
