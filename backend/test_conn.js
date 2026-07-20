import 'dotenv/config';
import net from 'net';

function testConnection(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log(`TCP connection to ${host}:${port} successful`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`TCP connection to ${host}:${port} timed out`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`TCP connection to ${host}:${port} failed - Error: ${err.message}`);
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function run() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  const databaseUrl = new URL(process.env.DATABASE_URL);
  const host = databaseUrl.hostname;
  const port = Number(databaseUrl.port || 5432);
  console.log(`Testing the configured database endpoint ${host}:${port}...`);
  await testConnection(host, port);
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
