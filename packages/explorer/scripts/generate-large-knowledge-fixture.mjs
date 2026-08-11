import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../test/fixtures/large-knowledge');

const categories = ['domains', 'integrations', 'flows', 'data', 'system'];
const topics = ['payment', 'orders', 'shipment', 'inventory', 'tenant', 'notification'];

fs.mkdirSync(outDir, { recursive: true });

let count = 0;
for (const cat of categories) {
  const catDir = path.join(outDir, cat);
  fs.mkdirSync(catDir, { recursive: true });
  for (let i = 0; i < 60; i++) {
    const topic = topics[i % topics.length];
    const fileName = `${topic}-${i}.md`;
    const content = `# ${topic} ${i}\n\nRabbitMQ integration for ${topic} service ${i}.\n\n## Details\n\nEvent-driven architecture with RabbitMQ broker.\n`;
    fs.writeFileSync(path.join(catDir, fileName), content);
    count++;
  }
}

console.log(`Generated ${count} markdown files in ${outDir}`);
