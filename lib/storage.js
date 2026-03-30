import fs from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.data');

export async function ensureStorage() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

export async function saveResults(results) {
  await ensureStorage();
  const filename = `scrape_${Date.now()}.json`;
  await fs.writeFile(
    path.join(STORAGE_DIR, filename),
    JSON.stringify(results, null, 2)
  );
  return filename;
}

export async function listResults() {
  await ensureStorage();
  const files = await fs.readdir(STORAGE_DIR);
  const results = [];
  
  for (const file of files) {
    if (file.startsWith('scrape_')) {
      const content = await fs.readFile(path.join(STORAGE_DIR, file), 'utf-8');
      results.push(JSON.parse(content));
    }
  }
  
  return results.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));
}

export async function saveChatSession(session) {
  await ensureStorage();
  const filename = `chat_${session.id}.json`;
  await fs.writeFile(
    path.join(STORAGE_DIR, filename),
    JSON.stringify(session, null, 2)
  );
}
