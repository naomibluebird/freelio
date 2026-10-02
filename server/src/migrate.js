// Upgrades an EXISTING database to match the current schema.sql, without losing data.
//   npm run db:migrate
// Safe to run more than once — every step checks first whether it's already done.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { dbConfig, DB_NAME } from './db.js';

const conn = await mysql.createConnection({ ...dbConfig, database: DB_NAME, multipleStatements: true });

const hasTable = async (t) => {
  const [r] = await conn.query('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [DB_NAME, t]);
  return r.length > 0;
};
const hasColumn = async (t, c) => {
  const [r] = await conn.query('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?', [DB_NAME, t, c]);
  return r.length > 0;
};
const log = (m) => console.log(`  - ${m}`);

console.log(`Migrating "${DB_NAME}"...`);

// 1. users.date_of_birth
if (!(await hasColumn('users', 'date_of_birth'))) {
  await conn.query('ALTER TABLE users ADD COLUMN date_of_birth DATE DEFAULT NULL AFTER role');
  log('added users.date_of_birth');
}

// 2. freelancer_profiles: own id (several profiles per user), is_primary, experience_level, timestamps
if (!(await hasColumn('freelancer_profiles', 'id'))) {
  await conn.query(`ALTER TABLE freelancer_profiles
    DROP PRIMARY KEY,
    ADD COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
    ADD INDEX idx_profile_user (user_id)`);
  log('freelancer_profiles now has its own id (several profiles per user allowed)');
}
if (!(await hasColumn('freelancer_profiles', 'is_primary'))) {
  await conn.query('ALTER TABLE freelancer_profiles ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0');
  await conn.query('UPDATE freelancer_profiles SET is_primary = 1'); // every existing user had exactly one profile
  log('added is_primary (existing profiles marked as default)');
}
if (!(await hasColumn('freelancer_profiles', 'experience_level'))) {
  await conn.query(`ALTER TABLE freelancer_profiles ADD COLUMN experience_level ENUM('entry','mid','senior') NOT NULL DEFAULT 'entry' AFTER bio`);
  await conn.query(`UPDATE freelancer_profiles SET experience_level = CASE
    WHEN experience_years >= 6 THEN 'senior' WHEN experience_years <= 2 THEN 'entry' ELSE 'mid' END`);
  log('added experience_level (filled in from years of experience)');
}
if (!(await hasColumn('freelancer_profiles', 'created_at'))) {
  await conn.query('ALTER TABLE freelancer_profiles ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  log('added freelancer_profiles.created_at');
}
if (!(await hasColumn('freelancer_profiles', 'updated_at'))) {
  await conn.query('ALTER TABLE freelancer_profiles ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  log('added freelancer_profiles.updated_at');
}

// 3. freelancer_skills: keyed by profile instead of by user
if (!(await hasColumn('freelancer_skills', 'profile_id'))) {
  await conn.query(`CREATE TABLE freelancer_skills_v2 (
    profile_id INT UNSIGNED NOT NULL,
    skill_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (profile_id, skill_id),
    FOREIGN KEY (profile_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  await conn.query(`INSERT IGNORE INTO freelancer_skills_v2 (profile_id, skill_id)
    SELECT fp.id, fs.skill_id FROM freelancer_skills fs JOIN freelancer_profiles fp ON fp.user_id = fs.user_id`);
  await conn.query('DROP TABLE freelancer_skills');
  await conn.query('RENAME TABLE freelancer_skills_v2 TO freelancer_skills');
  log('freelancer_skills now belong to a profile (existing skills copied over)');
}

// 4. certifications table
if (!(await hasTable('certifications'))) {
  await conn.query(`CREATE TABLE certifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    profile_id INT UNSIGNED NOT NULL,
    name VARCHAR(160) NOT NULL,
    issuer VARCHAR(160) DEFAULT '',
    year SMALLINT UNSIGNED DEFAULT NULL,
    INDEX idx_cert_profile (profile_id),
    FOREIGN KEY (profile_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  log('added certifications table');
}

// 5. applications.profile_id: which profile the proposal was sent from
if (!(await hasColumn('applications', 'profile_id'))) {
  await conn.query('ALTER TABLE applications ADD COLUMN profile_id INT UNSIGNED DEFAULT NULL AFTER freelancer_id');
  await conn.query(`UPDATE applications a JOIN freelancer_profiles fp ON fp.user_id = a.freelancer_id AND fp.is_primary = 1
    SET a.profile_id = fp.id`);
  // Any application left without a profile (freelancer had none) falls back to their first profile, if any.
  await conn.query(`UPDATE applications a JOIN freelancer_profiles fp ON fp.user_id = a.freelancer_id
    SET a.profile_id = fp.id WHERE a.profile_id IS NULL`);
  await conn.query(`ALTER TABLE applications
    MODIFY COLUMN profile_id INT UNSIGNED NOT NULL,
    ADD INDEX idx_application_profile (profile_id),
    ADD CONSTRAINT fk_application_profile FOREIGN KEY (profile_id) REFERENCES freelancer_profiles(id) ON DELETE RESTRICT`);
  log('applications now record the profile used (old ones attached to the default profile)');
}

console.log('Done.');
await conn.end();