// Devora VIP - Network Monitor Dashboard
// Real-time network monitoring with traffic analysis

const os = require('os');
const { exec } = require('child_process');
const net = require('net');

class NetworkMonitor {
  constructor() {
    this.connections = [];
    this.bandwidth = { incoming: 0, outgoing: 0 };
    this.scanInterval = null;
  }

  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = [];
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (!addr.internal) {
          result.push({ name, address: addr.address, family: addr.family, mac: addr.mac });
        }
      }
    }
    return result;
  }

  getActiveConnections() {
    return new Promise((resolve) => {
      const isWindows = os.platform() === 'win32';
      const cmd = isWindows ? 'netstat -an' : 'netstat -an';
      exec(cmd, (err, stdout) => {
        if (err) { resolve([]); return; }
        const lines = stdout.split('\n').filter(l => l.includes('ESTABLISHED'));
        const connections = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return { protocol: parts[0], local: parts[3], remote: parts[4], state: parts[5] };
        }).filter(c => c.local);
        resolve(connections.slice(0, 20));
      });
    });
  }

  ping(host) {
    return new Promise((resolve) => {
      const isWindows = os.platform() === 'win32';
      const cmd = isWindows ? `ping -n 1 ${host}` : `ping -c 1 ${host}`;
      const start = Date.now();
      exec(cmd, (err) => {
        const latency = Date.now() - start;
        resolve({ host, reachable: !err, latency });
      });
    });
  }

  checkPort(host, port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.on('connect', () => { socket.destroy(); resolve({ host, port, open: true }); });
      socket.on('timeout', () => { socket.destroy(); resolve({ host, port, open: false }); });
      socket.on('error', () => { resolve({ host, port, open: false }); });
      socket.connect(port, host);
    });
  }

  async scanCommonPorts(host) {
    const ports = [22, 80, 443, 3306, 5432, 8080, 8443];
    const results = [];
    for (const port of ports) {
      const result = await this.checkPort(host, port);
      results.push(result);
    }
    return results;
  }

  generateReport() {
    const interfaces = this.getNetworkInterfaces();
    console.log('\n' + '='.repeat(50));
    console.log('  Network Monitor Dashboard - Devora VIP');
    console.log('='.repeat(50));
    console.log('\n[Network Interfaces]');
    interfaces.forEach(i => console.log(`  ${i.name}: ${i.address} (${i.family})`));
    return { interfaces, timestamp: new Date().toISOString() };
  }

  async start() {
    console.log('Starting network monitor...');
    this.generateReport();

    console.log('\n[Pinging common hosts...]');
    const hosts = ['8.8.8.8', '1.1.1.1', 'google.com'];
    for (const host of hosts) {
      const result = await this.ping(host);
      console.log(`  ${result.host}: ${result.reachable ? 'Reachable' : 'Unreachable'} (${result.latency}ms)`);
    }

    console.log('\n[Active Connections]');
    const connections = await this.getActiveConnections();
    connections.forEach(c => console.log(`  ${c.protocol} ${c.local} -> ${c.remote} (${c.state})`));
  }
}

// CLI
const monitor = new NetworkMonitor();
monitor.start().catch(console.error);
