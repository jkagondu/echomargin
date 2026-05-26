const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'copy_links.json');

// Check if we have PostgreSQL config
const isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;

if (isPostgres) {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('ssl=true') ? { rejectUnauthorized: false } : false
    });
    console.log('[DB] Live PostgreSQL Cloud Database connection initialized.');
  } catch (err) {
    console.warn('[DB] "pg" module not installed or load failed. Falling back to local file database.');
  }
}

// Ensure local file fallback is initialized
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

async function initDatabase() {
  if (pgPool) {
    try {
      // Create table if it doesn't exist
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS copy_links (
          id VARCHAR(50) PRIMARY KEY,
          master_id VARCHAR(50) NOT NULL,
          copy_ratio NUMERIC NOT NULL,
          max_allocation NUMERIC NOT NULL,
          copier_account_id VARCHAR(50) NOT NULL,
          created_at BIGINT NOT NULL
        )
      `);
      console.log('[DB] PostgreSQL copy_links table verified.');
    } catch (err) {
      console.error('[DB] Failed to initialize PostgreSQL table:', err.message);
      pgPool = null; // fallback
    }
  }
}

// Run initialization
initDatabase();

async function readCopyLinks() {
  if (pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM copy_links ORDER BY created_at DESC');
      return res.rows.map(r => ({
        id: r.id,
        masterId: r.master_id,
        copyRatio: parseFloat(r.copy_ratio),
        maxAllocation: parseFloat(r.max_allocation),
        copierAccountId: r.copier_account_id,
        createdAt: parseInt(r.created_at)
      }));
    } catch (err) {
      console.error('[DB] PostgreSQL read failed:', err.message);
    }
  }
  
  // Fallback to file-based
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[DB] File database read failed:', err);
    return [];
  }
}

async function writeCopyLink(newLink) {
  if (pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO copy_links (id, master_id, copy_ratio, max_allocation, copier_account_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newLink.id, newLink.masterId, newLink.copyRatio, newLink.maxAllocation, newLink.copierAccountId, newLink.createdAt]
      );
      return true;
    } catch (err) {
      console.error('[DB] PostgreSQL write failed:', err.message);
    }
  }

  // Fallback to file-based
  try {
    const links = await readCopyLinks();
    links.push(newLink);
    fs.writeFileSync(DB_FILE, JSON.stringify(links, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[DB] File database write failed:', err);
    return false;
  }
}

async function findCopyLink(id) {
  if (pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM copy_links WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          masterId: r.master_id,
          copyRatio: parseFloat(r.copy_ratio),
          maxAllocation: parseFloat(r.max_allocation),
          copierAccountId: r.copier_account_id,
          createdAt: parseInt(r.created_at)
        };
      }
      return null;
    } catch (err) {
      console.error('[DB] PostgreSQL find failed:', err.message);
    }
  }

  // Fallback
  const links = await readCopyLinks();
  return links.find(l => l.id === id) || null;
}

module.exports = {
  readCopyLinks,
  writeCopyLink,
  findCopyLink
};
