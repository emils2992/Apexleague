const fs = require('fs');
const path = require('path');

// Path to the JSON file for storing settings
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'settings.json');

// Initialize the database file if it doesn't exist
function initDb() {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Create the database file if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    console.log('Database file created at:', dbPath);
  }
}

// Read the database file
function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file:', error);
    // Return empty object if there's an error
    return {};
  }
}

// Write to the database file
function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log('Database updated successfully');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

// Get settings for a specific guild
async function getGuildSettings(guildId) {
  const db = readDb();
  return db[guildId] || null;
}

// Save settings for a specific guild
async function saveGuildSettings(guildId, settings) {
  const db = readDb();
  db[guildId] = settings;
  writeDb(db);
  return settings;
}

// Delete settings for a specific guild
async function deleteGuildSettings(guildId) {
  const db = readDb();
  if (db[guildId]) {
    delete db[guildId];
    writeDb(db);
    return true;
  }
  return false;
}

module.exports = {
  getGuildSettings,
  saveGuildSettings,
  deleteGuildSettings
};
