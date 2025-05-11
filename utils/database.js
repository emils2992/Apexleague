const fs = require('fs');
const path = require('path');

// Path to the JSON files for storing settings and registrations
const dataDir = path.join(__dirname, '..', 'data');
const settingsPath = path.join(dataDir, 'settings.json');
const registrationsPath = path.join(dataDir, 'registrations.json');

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

// Read the settings database file
function readSettings() {
  initDb();
  try {
    const data = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings database file:', error);
    // Return empty object if there's an error
    return {};
  }
}

// Write to the settings database file
function writeSettings(data) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
    console.log('Settings database updated successfully');
  } catch (error) {
    console.error('Error writing to settings database file:', error);
  }
}

// Read the registrations database file
function readRegistrations() {
  initDb();
  try {
    const data = fs.readFileSync(registrationsPath, 'utf8');
    const parsedData = JSON.parse(data);
    
    // Ensure the registrations array exists
    if (!parsedData.registrations) {
      parsedData.registrations = [];
    }
    
    return parsedData;
  } catch (error) {
    console.error('Error reading registrations database file:', error);
    // Return empty registrations array if there's an error
    return { registrations: [] };
  }
}

// Write to the registrations database file
function writeRegistrations(data) {
  try {
    fs.writeFileSync(registrationsPath, JSON.stringify(data, null, 2));
    console.log('Registrations database updated successfully');
  } catch (error) {
    console.error('Error writing to registrations database file:', error);
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

// Add a new registration record
async function addRegistration(registrationData) {
  const db = readRegistrations();
  
  // Generate a unique ID for the registration
  registrationData.id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
  
  // Add timestamp if not provided
  if (!registrationData.timestamp) {
    registrationData.timestamp = new Date().toISOString();
  }
  
  db.registrations.push(registrationData);
  writeRegistrations(db);
  
  return registrationData;
}

// Update a registration with assigned role information
async function updateRegistrationRole(guildId, memberId, roleId, roleName) {
  const db = readRegistrations();
  
  // Find the most recent registration for this member in this guild
  // that doesn't have a role assigned yet
  const recentRegistrations = db.registrations
    .filter(reg => reg.guildId === guildId && reg.memberId === memberId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const regIndex = db.registrations.indexOf(recentRegistrations[0]);
  
  if (regIndex !== -1) {
    // Update the registration with role info
    db.registrations[regIndex].assignedRole = roleName;
    db.registrations[regIndex].assignedRoleId = roleId;
    db.registrations[regIndex].roleAssignedAt = new Date().toISOString();
    
    writeRegistrations(db);
    return db.registrations[regIndex];
  }
  
  return null;
}

// Get all registrations for a guild
async function getRegistrations(guildId) {
  const db = readRegistrations();
  return db.registrations.filter(registration => registration.guildId === guildId);
}

// Get registration stats per staff member
async function getStaffStats(guildId) {
  const registrations = await getRegistrations(guildId);
  
  // Group registrations by staff member
  const staffStats = {};
  
  registrations.forEach(reg => {
    if (!staffStats[reg.staffId]) {
      staffStats[reg.staffId] = {
        id: reg.staffId,
        name: reg.staffName || 'Bilinmeyen Yetkili',
        count: 0
      };
    }
    staffStats[reg.staffId].count++;
  });
  
  // Convert to array and sort by count
  return Object.values(staffStats).sort((a, b) => b.count - a.count);
}

module.exports = {
  getGuildSettings,
  saveGuildSettings,
  deleteGuildSettings,
  addRegistration,
  updateRegistrationRole,
  getRegistrations,
  getStaffStats
};
