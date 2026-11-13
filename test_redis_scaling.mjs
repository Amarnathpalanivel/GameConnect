import { createAdapter } from './server/node_modules/@socket.io/redis-adapter/dist/index.js';
import { EventEmitter } from 'events';
import { Server } from './server/node_modules/socket.io/dist/index.js';
import { createServer } from 'http';
import { io as Client } from './client/node_modules/socket.io-client/build/esm/index.js';

console.log('=====================================================');
console.log('🚀 TESTING MULTI-INSTANCE SOCKET.IO REDIS ADAPTER');
console.log('=====================================================\n');

// Central pub/sub message bus simulating managed Redis
const redisPubSubBus = new EventEmitter();

function createSimulatedRedisClient() {
  const client = new EventEmitter();

  client.sSubscribe = async (channels, listener) => {
    const list = Array.isArray(channels) ? channels : [channels];
    list.forEach((c) => redisPubSubBus.on(c, listener));
  };

  client.sUnsubscribe = async (channels) => {
    const list = Array.isArray(channels) ? channels : [channels];
    list.forEach((c) => redisPubSubBus.removeAllListeners(c));
  };

  client.subscribe = async (channels, listener) => {
    const list = Array.isArray(channels) ? channels : [channels];
    list.forEach((c) => redisPubSubBus.on(c, listener));
  };

  client.unsubscribe = async (channels) => {
    const list = Array.isArray(channels) ? channels : [channels];
    list.forEach((c) => redisPubSubBus.removeAllListeners(c));
  };

  client.pSubscribe = async (patterns, listener) => {
    const list = Array.isArray(patterns) ? patterns : [patterns];
    list.forEach((p) => {
      const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
      redisPubSubBus.on('__redis_pub__', (channel, msg) => {
        if (regex.test(channel)) {
          listener(msg, channel);
        }
      });
    });
  };

  client.pUnsubscribe = async () => {};

  client.publish = async (channel, message) => {
    redisPubSubBus.emit(channel, message, channel);
    redisPubSubBus.emit('__redis_pub__', channel, message);
  };

  client.duplicate = () => createSimulatedRedisClient();
  client.connect = async () => {};
  return client;
}

const pub1 = createSimulatedRedisClient();
const sub1 = createSimulatedRedisClient();
const pub2 = createSimulatedRedisClient();
const sub2 = createSimulatedRedisClient();

// Setup Server Instance 1 (Port 6001)
const server1 = createServer();
const io1 = new Server(server1, {
  cors: { origin: '*' },
  adapter: createAdapter(pub1, sub1),
});

// Setup Server Instance 2 (Port 6002)
const server2 = createServer();
const io2 = new Server(server2, {
  cors: { origin: '*' },
  adapter: createAdapter(pub2, sub2),
});

io2.on('connection', (socket) => {
  socket.on('join_squad_room', (room) => {
    socket.join(room);
  });
});

server1.listen(6001, () => {
  console.log('📡 Server Instance 1 online on port 6001 (Node A)');
  server2.listen(6002, () => {
    console.log('📡 Server Instance 2 online on port 6002 (Node B)');

    // Client B connects ONLY to Server Instance 2
    const clientB = Client('http://localhost:6002');

    clientB.on('connect', () => {
      console.log('👤 Client B connected to Server Instance 2 (Socket ID:', clientB.id, ')');
      clientB.emit('join_squad_room', 'scrim_match_radiant');
      console.log('   ↳ Client B joined room: "scrim_match_radiant"');
    });

    clientB.on('scrim_alert', (payload) => {
      console.log('\n=====================================================');
      console.log('✅ VERIFICATION SUCCESS: Cross-Instance Broadcast Received!');
      console.log('=====================================================');
      console.log('1. Originating Server: Server Instance 1 (Port 6001)');
      console.log('2. Receiving Client:   Connected to Server Instance 2 (Port 6002)');
      console.log('3. Room Filter:        "scrim_match_radiant"');
      console.log('4. Event Relayed:     ', JSON.stringify(payload, null, 2));

      clientB.disconnect();
      server1.close();
      server2.close();
      process.exit(0);
    });

    // Server Instance 1 broadcasts to room 'scrim_match_radiant'
    setTimeout(() => {
      console.log('\n📢 Server Instance 1 broadcasting "scrim_alert" to room "scrim_match_radiant"...');
      io1.to('scrim_match_radiant').emit('scrim_alert', {
        type: 'SCRIM_READY_CHECK',
        matchId: 'scrim_match_radiant',
        server: '198.51.100.45:27015',
        message: 'All squad members ready. Broadcast synced across cluster via Redis Adapter!',
        timestamp: new Date().toISOString(),
      });
    }, 1000);
  });
});
