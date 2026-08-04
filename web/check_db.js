const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).replace(/"/g, '').trim();
});

const pool = new Pool({ connectionString: envVars.DATABASE_URL });
const adapter = new (require('@prisma/adapter-pg').PrismaPg)(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const urlsToTest = [
    { name: 'SSC Exams', url: 'https://image.pngaaa.com/279/10279-middle.png' },
    { name: 'CBSE Exams (CTET)', url: 'https://upload.wikimedia.org/wikipedia/hi/archive/d/d5/20170528202850%21Cbse-logo.png' },
  ];
  const fetch = (await import('node-fetch')).default;
  for (const { name, url } of urlsToTest) {
    try {
      const res = await fetch(url, { method: 'HEAD', timeout: 5000 });
      console.log(`${name}: HTTP ${res.status} ${res.statusText} - Content-Type: ${res.headers.get('content-type')}`);
    } catch (err) {
      console.log(`${name}: ERROR - ${err.message}`);
    }
  }
}

check().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });

