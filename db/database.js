const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'eggtrack.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS flocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flock_name TEXT NOT NULL,
    breed TEXT,
    bird_count INTEGER,
    hatch_date DATE,
    housing_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stage_advisories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flock_id INTEGER NOT NULL,
    current_stage TEXT NOT NULL,
    feed_recommendation TEXT,
    lighting_schedule TEXT,
    vaccination_due TEXT,
    risk_alerts TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flock_id) REFERENCES flocks(id)
  );

  CREATE TABLE IF NOT EXISTS production_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flock_id INTEGER NOT NULL,
    log_date DATE NOT NULL,
    eggs_collected INTEGER,
    mortality_count INTEGER DEFAULT 0,
    feed_consumed_kg REAL,
    FOREIGN KEY (flock_id) REFERENCES flocks(id)
  );

  CREATE TABLE IF NOT EXISTS diagnoses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flock_id INTEGER NOT NULL,
    symptoms TEXT NOT NULL,
    likely_cause TEXT,
    confidence TEXT,
    recommended_action TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flock_id) REFERENCES flocks(id)
  );
`);

console.log('Database tables ready.');

module.exports = db;