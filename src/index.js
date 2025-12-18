// import { setupServer } from './server.js';
// import { initMongoConnection } from './db/initMongoConnection.js';

// const bootstrap = async () => {
//   await initMongoConnection();
//   setupServer();
// };

// bootstrap();

import { setupServer } from './server.js';
import { initMongoConnection } from './db/initMongoConnection.js';
import UserCollection from './db/models/User.js';

const bootstrap = async () => {
  await initMongoConnection();

  try {
    await UserCollection.updateMany(
      {},
      { $set: { onlineConnections: 0, onlineStatus: false } },
    );
    console.log('[server] reset onlineConnections / onlineStatus on startup');
  } catch (err) {
    console.error('[server] failed to reset online state on startup', err);
  }

  setupServer();
};

bootstrap();
