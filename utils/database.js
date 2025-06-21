const fs = require('fs');
const path = require('path');

// Path to the JSON files for storing settings and registrations
const dataDir = path.join(__dirname, '..', 'data');
const settingsPath = path.join(dataDir, 'settings.json');
const registrationsPath = path.join(dataDir, 'registrations.json');

// Memory cache for fast data access
let registrationsCache = null;
let settingsCache = null;
let cacheLastUpdated = {
  registrations: 0,
  settings: 0
};

// Initialize the database files if they don't exist
function initDb() {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Create the settings file if it doesn't exist
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify({}, null, 2));
    console.log('Settings database file created at:', settingsPath);
  }
  
  // Create the registrations file if it doesn't exist
  if (!fs.existsSync(registrationsPath)) {
    fs.writeFileSync(registrationsPath, JSON.stringify({ registrations: [] }, null, 2));
    console.log('Registrations database file created at:', registrationsPath);
  }
}

// Read the settings database file with caching
function readSettings() {
  initDb();
  
  // Check if cache is valid
  const fileStats = fs.statSync(settingsPath);
  const fileModified = fileStats.mtime.getTime();
  
  if (settingsCache && cacheLastUpdated.settings >= fileModified) {
    return settingsCache;
  }
  
  try {
    const data = fs.readFileSync(settingsPath, 'utf8');
    settingsCache = JSON.parse(data);
    cacheLastUpdated.settings = Date.now();
    return settingsCache;
  } catch (error) {
    console.error('Error reading settings database file:', error);
    // Return empty object if there's an error
    settingsCache = {};
    return settingsCache;
  }
}

// Write to the settings database file with cache update
function writeSettings(data) {
  try {
    // Update cache immediately for instant access
    settingsCache = data;
    cacheLastUpdated.settings = Date.now();
    
    // Write to file asynchronously for persistence
    fs.writeFile(settingsPath, JSON.stringify(data, null, 2), (error) => {
      if (error) {
        console.error('Error writing to settings database file:', error);
      } else {
        console.log('Settings database updated successfully');
      }
    });
  } catch (error) {
    console.error('Error updating settings cache:', error);
  }
}

// Read the registrations database file with caching
function readRegistrations() {
  initDb();
  
  // Check if cache is valid
  const fileStats = fs.statSync(registrationsPath);
  const fileModified = fileStats.mtime.getTime();
  
  if (registrationsCache && cacheLastUpdated.registrations >= fileModified) {
    return registrationsCache;
  }
  
  try {
    const data = fs.readFileSync(registrationsPath, 'utf8');
    const parsedData = JSON.parse(data);
    
    // Ensure the registrations array exists
    if (!parsedData.registrations) {
      parsedData.registrations = [];
    }
    
    registrationsCache = parsedData;
    cacheLastUpdated.registrations = Date.now();
    return registrationsCache;
  } catch (error) {
    console.error('Error reading registrations database file:', error);
    // Return empty registrations array if there's an error
    registrationsCache = { registrations: [] };
    return registrationsCache;
  }
}

// Write to the registrations database file with instant cache update
function writeRegistrations(data) {
  try {
    // Update cache immediately for instant access
    registrationsCache = data;
    cacheLastUpdated.registrations = Date.now();
    
    // Write to file asynchronously for persistence
    fs.writeFile(registrationsPath, JSON.stringify(data, null, 2), (error) => {
      if (error) {
        console.error('Error writing to registrations database file:', error);
      } else {
        console.log('Registrations database updated successfully');
      }
    });
  } catch (error) {
    console.error('Error updating registrations cache:', error);
  }
}

// Get settings for a specific guild
async function getGuildSettings(guildId) {
  const db = readSettings();
  const settings = db[guildId] || null;
  
  if (settings) {
    // Eski format kontrolü ve düzeltme
    if (settings.bayanRole && !settings.bayanUyeRole) {
      console.log(`[DÜZELTME] ${guildId} için bayanRole -> bayanUyeRole olarak düzeltildi`);
      settings.bayanUyeRole = settings.bayanRole;
      delete settings.bayanRole;
      
      // Değişiklikleri kaydet
      db[guildId] = settings;
      writeSettings(db);
    }
    
    if (settings.tdRole && !settings.teknikDirektorRole) {
      console.log(`[DÜZELTME] ${guildId} için tdRole -> teknikDirektorRole olarak düzeltildi`);
      settings.teknikDirektorRole = settings.tdRole;
      delete settings.tdRole;
      
      // Değişiklikleri kaydet
      db[guildId] = settings;
      writeSettings(db);
    }
  }
  
  return settings;
}

// Save settings for a specific guild
async function saveGuildSettings(guildId, settings) {
  const db = readSettings();
  
  // Alan adı tutarlılığı için eski format kontrolü
  if (settings.bayanRole && !settings.bayanUyeRole) {
    console.log(`[DÜZELTME] ${guildId} için bayanRole -> bayanUyeRole olarak güncellendi`);
    settings.bayanUyeRole = settings.bayanRole;
    delete settings.bayanRole;
  }
  
  if (settings.tdRole && !settings.teknikDirektorRole) {
    console.log(`[DÜZELTME] ${guildId} için tdRole -> teknikDirektorRole olarak güncellendi`);
    settings.teknikDirektorRole = settings.tdRole;
    delete settings.tdRole;
  }
  
  db[guildId] = settings;
  writeSettings(db);
  return settings;
}

// Delete settings for a specific guild
async function deleteGuildSettings(guildId) {
  const db = readSettings();
  if (db[guildId]) {
    delete db[guildId];
    writeSettings(db);
    return true;
  }
  return false;
}

// Add a new registration record with instant cache update
async function addRegistration(registrationData) {
  const startTime = Date.now();
  
  // Generate a unique ID for the registration
  registrationData.id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
  
  // Add timestamp if not provided
  if (!registrationData.timestamp) {
    registrationData.timestamp = new Date().toISOString();
  }
  
  // Get current data (from cache if available)
  const db = readRegistrations();
  
  // Add to cache immediately for instant access
  db.registrations.push(registrationData);
  
  // Update cache and write to file asynchronously
  setImmediate(() => writeRegistrations(db));
  
  return registrationData;
}

// Update a registration with assigned role information with instant cache update
function updateRegistrationRole(guildId, memberId, roleId, roleName) {
  // Get current data (from cache if available)
  const db = readRegistrations();
  
  // Find the most recent registration for this member in this guild
  // that doesn't have a role assigned yet
  const recentRegistrations = db.registrations
    .filter(reg => reg.guildId === guildId && reg.memberId === memberId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const regIndex = db.registrations.indexOf(recentRegistrations[0]);
  
  if (regIndex !== -1) {
    // Update the registration with role info in cache immediately
    db.registrations[regIndex].assignedRole = roleName;
    db.registrations[regIndex].assignedRoleId = roleId;
    db.registrations[regIndex].roleAssignedAt = new Date().toISOString();
    
    // Write to file asynchronously without blocking
    setImmediate(() => writeRegistrations(db));
    
    return db.registrations[regIndex];
  }
  
  return null;
}

// Get all registrations for a guild with instant cache access
async function getRegistrations(guildId) {
  const db = readRegistrations();
  const guildRegistrations = db.registrations.filter(registration => registration.guildId === guildId);
  return guildRegistrations;
}

// Get registration stats per staff member with optimized processing
async function getStaffStats(guildId) {
  const startTime = Date.now();
  const registrations = await getRegistrations(guildId);
  
  // Group registrations by staff member with optimized loop
  const staffStats = {};
  
  for (const reg of registrations) {
    if (!staffStats[reg.staffId]) {
      staffStats[reg.staffId] = {
        id: reg.staffId,
        name: reg.staffName || 'Bilinmeyen Yetkili',
        count: 0
      };
    }
    staffStats[reg.staffId].count++;
  }
  
  // Convert to array and sort by count
  const result = Object.values(staffStats).sort((a, b) => b.count - a.count);
  
  return result;
}

// Preload cache function for instant startup
function preloadCache() {
  console.log('[CACHE] Preloading data for instant access...');
  const startTime = Date.now();
  
  try {
    // Preload settings
    readSettings();
    
    // Preload registrations
    readRegistrations();
    
    const loadTime = Date.now() - startTime;
    console.log(`[CACHE] Data preloaded successfully in ${loadTime}ms`);
    console.log(`[CACHE] Settings cache ready: ${settingsCache ? 'YES' : 'NO'}`);
    console.log(`[CACHE] Registrations cache ready: ${registrationsCache ? 'YES' : 'NO'}`);
    
    if (registrationsCache) {
      console.log(`[CACHE] Total registrations loaded: ${registrationsCache.registrations.length}`);
    }
  } catch (error) {
    console.error('[CACHE] Error preloading cache:', error);
  }
}

// Clear cache function for maintenance
function clearCache() {
  console.log('[CACHE] Clearing memory cache...');
  registrationsCache = null;
  settingsCache = null;
  cacheLastUpdated.registrations = 0;
  cacheLastUpdated.settings = 0;
  console.log('[CACHE] Memory cache cleared');
}

// Get cache status for debugging
function getCacheStatus() {
  return {
    registrations: {
      cached: !!registrationsCache,
      lastUpdated: cacheLastUpdated.registrations,
      recordCount: registrationsCache ? registrationsCache.registrations.length : 0
    },
    settings: {
      cached: !!settingsCache,
      lastUpdated: cacheLastUpdated.settings,
      guildCount: settingsCache ? Object.keys(settingsCache).length : 0
    }
  };
}

module.exports = {
  getGuildSettings,
  saveGuildSettings,
  deleteGuildSettings,
  addRegistration,
  updateRegistrationRole,
  getRegistrations,
  getStaffStats,
  preloadCache,
  clearCache,
  getCacheStatus
};
