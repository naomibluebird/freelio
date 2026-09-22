// Creates the database, tables and (on first run) demo data.
//   npm run db:setup   -> create everything, seed only if empty
//   npm run db:reset   -> drop all tables and start fresh
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { dbConfig, DB_NAME } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reset = process.argv.includes('--reset');

const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.query(`USE \`${DB_NAME}\``);

if (reset) {
  console.log('Dropping existing tables...');
  await conn.query(`SET FOREIGN_KEY_CHECKS = 0;
    DROP TABLE IF EXISTS reviews, saved_projects, applications, project_skills, projects, freelancer_skills, skills,
      client_profiles, freelancer_profiles, users;
    SET FOREIGN_KEY_CHECKS = 1;`);
}

await conn.query(fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8'));
console.log('Tables ready.');

const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM users');
if (n > 0) {
  console.log('Database already has data - skipping demo seed. Use "npm run db:reset" to start over.');
  await conn.end();
  process.exit(0);
}

// ---------- Demo data ----------
const hash = (p) => bcrypt.hashSync(p, 10);
const ids = {};

async function addUser(key, name, email, role, password) {
  const [r] = await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)', [name, email, hash(password), role]);
  ids[key] = r.insertId;
  return r.insertId;
}

async function skillId(name) {
  await conn.query('INSERT IGNORE INTO skills (name) VALUES (?)', [name]);
  const [[row]] = await conn.query('SELECT id FROM skills WHERE name = ?', [name]);
  return row.id;
}

await addUser('admin', 'Freelio Admin', 'admin@freelio.dev', 'admin', 'Admin123!');

// Clients
const clients = [
  ['c1', 'Rahel Assefa', 'rahel@sheba-coffee.example', 'Sheba Coffee Co.', 'Addis Ababa', 'Specialty coffee roaster shipping Ethiopian beans worldwide.'],
  ['c2', 'Michael Bekele', 'michael@addisledger.example', 'Addis Ledger', 'Addis Ababa', 'A bookkeeping and payments startup for small businesses.'],
  ['c3', 'Sara Lindqvist', 'sara@northwind.example', 'Northwind Studio', 'Stockholm', 'Remote-first product studio building apps for health and education.'],
  ['c4', 'Tomas Abebe', 'tomas@nilelogistics.example', 'Nile Logistics', 'Adama', 'Freight and last-mile delivery across East Africa.'],
];
for (const [key, name, email, company, location, about] of clients) {
  const id = await addUser(key, name, email, 'client', 'Client123!');
  await conn.query('INSERT INTO client_profiles (user_id, company_name, about, location, website) VALUES (?,?,?,?,?)', [id, company, about, location, '']);
}

// Freelancers
const freelancers = [
  ['f1', 'Hana Tesfaye', 'Full-stack developer (React & Node)', 'I build fast, accessible web apps for startups. Six years shipping dashboards, marketplaces and internal tools, from database design to deployment.', 35, 'USD', 'Addis Ababa', 6, 'available', 1, ['React', 'Node.js', 'MySQL', 'Express']],
  ['f2', 'Dawit Bekele', 'UI/UX designer', 'Product designer focused on clear interfaces and design systems. I run quick research sprints, then deliver clean Figma files developers love.', 28, 'USD', 'Addis Ababa', 5, 'available', 1, ['Figma', 'UI Design', 'Prototyping', 'Design Systems']],
  ['f3', 'Selam Alemu', 'Content writer & translator', 'Amharic-English writer and translator. Website copy, blog posts, product descriptions and subtitles with quick turnaround.', 15, 'USD', 'Bahir Dar', 4, 'available', 1, ['Copywriting', 'Translation', 'SEO', 'Amharic']],
  ['f4', 'Yonas Girma', 'Mobile developer (Flutter)', 'Cross-platform apps with Flutter and Firebase. Comfortable with payment integrations and offline-first design.', 32, 'USD', 'Hawassa', 4, 'busy', 1, ['Flutter', 'Dart', 'Firebase', 'REST APIs']],
  ['f5', 'Meron Haile', 'Digital marketing specialist', 'Growth marketer running paid social, email and SEO for e-commerce and service brands. I report in plain language and focus on revenue.', 22, 'USD', 'Addis Ababa', 5, 'available', 1, ['SEO', 'Social Media', 'Google Ads', 'Email Marketing']],
  ['f6', 'Abel Tadesse', 'Data analyst', 'I turn messy spreadsheets and databases into dashboards people actually read. SQL, Python and Power BI.', 25, 'USD', 'Adama', 3, 'available', 0, ['SQL', 'Python', 'Power BI', 'Excel']],
  ['f7', 'Liya Mengistu', 'Graphic designer & illustrator', 'Brand identity, packaging and social graphics with a warm, hand-made feel.', 18, 'USD', 'Addis Ababa', 4, 'available', 0, ['Illustrator', 'Photoshop', 'Branding', 'Packaging']],
  ['f8', 'Nahom Kebede', 'WordPress & PHP developer', 'Custom WordPress themes, WooCommerce stores and PHP/Laravel back ends for small businesses.', 20, 'USD', 'Mekelle', 7, 'available', 0, ['PHP', 'Laravel', 'WordPress', 'MySQL']],
];
for (const [key, name, title, bio, rate, cur, loc, yrs, avail, featured, skills] of freelancers) {
  const id = await addUser(key, name, `${name.split(' ')[0].toLowerCase()}@freelio.example`, 'freelancer', 'Freelancer123!');
  await conn.query(
    `INSERT INTO freelancer_profiles (user_id, title, bio, hourly_rate, rate_currency, location, experience_years, availability, is_featured)
     VALUES (?,?,?,?,?,?,?,?,?)`, [id, title, bio, rate, cur, loc, yrs, avail, featured]);
  for (const s of skills) await conn.query('INSERT INTO freelancer_skills (user_id, skill_id) VALUES (?,?)', [id, await skillId(s)]);
}

// Projects
const daysFromNow = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const projects = [
  ['c1', 'Build an online store for our coffee subscriptions', 'We need a fast storefront where customers can pick a roast, choose a delivery schedule and pay online. Includes an admin view for managing orders and a simple email receipt. We have brand assets ready and a clear product list.', 'Web Development', 'contract', 'remote', '', 2500, 4000, 'fixed', 'USD', 'mid', 30, 1, ['React', 'Node.js', 'MySQL']],
  ['c2', 'Senior full-stack developer for invoicing platform', 'Join our small product team to build invoicing, expense tracking and reporting features. You will own features end to end: API design, database, and React interface. Code reviews and weekly planning are part of the job.', 'Web Development', 'full-time', 'on-site', 'Addis Ababa', 60000, 90000, 'monthly', 'ETB', 'senior', 21, 1, ['React', 'Node.js', 'MySQL', 'Express']],
  ['c3', 'Design system refresh for a health app', 'Our mobile and web apps have grown organically. We need a cohesive component library in Figma, with tokens, documentation and accessibility checks, delivered in phases.', 'UI/UX Design', 'contract', 'remote', '', 40, 55, 'hourly', 'USD', 'senior', 45, 1, ['Figma', 'Design Systems', 'UI Design']],
  ['c4', 'Driver tracking mobile app', 'Build a Flutter app for our delivery drivers to accept jobs, update statuses and share their location. We already have a REST API; you will integrate and polish the experience.', 'Mobile Apps', 'contract', 'hybrid', 'Adama', 3000, 5000, 'fixed', 'USD', 'mid', 28, 1, ['Flutter', 'Dart', 'REST APIs']],
  ['c1', 'Part-time social media manager', 'Plan and publish three posts a week across Instagram and Telegram, reply to comments and report monthly results. Photography is provided by our team.', 'Digital Marketing', 'part-time', 'remote', '', 8000, 12000, 'monthly', 'ETB', 'entry', 14, 0, ['Social Media', 'Copywriting']],
  ['c2', 'Translate our help center into Amharic', 'About 60 short help articles need translation from English to Amharic, keeping a friendly and precise tone. We will provide a glossary of product terms.', 'Writing & Translation', 'contract', 'remote', '', 350, 600, 'fixed', 'USD', 'mid', 20, 0, ['Translation', 'Amharic']],
  ['c3', 'Data dashboard for weekly learning metrics', 'Connect our database to a dashboard that shows learner activity, completion rates and retention by cohort. Clear charts and a short handover session are required.', 'Data & Analytics', 'part-time', 'remote', '', 25, 40, 'hourly', 'USD', 'mid', 25, 1, ['SQL', 'Power BI', 'Python']],
  ['c4', 'Customer support agent (Amharic and English)', 'Answer customer calls and chats about shipment status, help with claims and log every case. Training is provided. Shifts are Monday to Friday.', 'Customer Support', 'full-time', 'on-site', 'Adama', 12000, 16000, 'monthly', 'ETB', 'entry', 10, 0, ['Customer Service', 'Amharic']],
  ['c1', 'Packaging design for a new single-origin line', 'Design labels and boxes for three new single-origin coffees. Print-ready files and a mockup of each pack are expected. Illustration style should feel warm and hand-made.', 'Graphic Design', 'contract', 'remote', '', 600, 1000, 'fixed', 'USD', 'mid', 18, 0, ['Illustrator', 'Packaging', 'Branding']],
  ['c2', 'Promo video for our new mobile wallet', 'A 45-second animated explainer video with voice-over in English and Amharic. Script outline is ready; we need storyboard, animation and final export for social platforms.', 'Video & Animation', 'contract', 'remote', '', 800, 1500, 'fixed', 'USD', 'mid', 32, 0, ['Motion Graphics', 'Video Editing']],
  ['c3', 'Virtual assistant for scheduling and inbox', 'Manage calendars, book meetings across time zones and keep our shared inbox tidy. Around 15 hours per week, flexible hours within European mornings.', 'Admin & Virtual Assistance', 'part-time', 'remote', '', 8, 12, 'hourly', 'USD', 'entry', 12, 0, ['Scheduling', 'Email Management']],
  ['c4', 'WordPress site with shipment tracking form', 'Redesign our company website on WordPress and add a tracking form that queries our existing API. Mobile-friendly layout and basic SEO setup included.', 'Web Development', 'contract', 'remote', '', 1200, 2000, 'fixed', 'USD', 'mid', 26, 0, ['PHP', 'WordPress', 'REST APIs']],
];
const projectIds = [];
for (const [client, title, desc, cat, jt, wm, loc, bmin, bmax, btype, cur, lvl, deadlineDays, featured, skills] of projects) {
  const [r] = await conn.query(
    `INSERT INTO projects (client_id, title, description, category, job_type, work_mode, location, budget_min, budget_max, budget_type,
      currency, experience_level, deadline, is_featured, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, NOW() - INTERVAL ? DAY)`,
    [ids[client], title, desc, cat, jt, wm, loc, bmin, bmax, btype, cur, lvl, daysFromNow(deadlineDays), featured, projectIds.length]);
  projectIds.push(r.insertId);
  for (const s of skills) await conn.query('INSERT INTO project_skills (project_id, skill_id) VALUES (?,?)', [r.insertId, await skillId(s)]);
}

// Applications and reviews (project index -> freelancer key -> status)
const apps = [
  [0, 'f1', 'accepted', 'I have built three subscription storefronts with React and Node. I can deliver the checkout, order admin and email receipts within four weeks.', 3200],
  [0, 'f8', 'shortlisted', 'I can build this on PHP and MySQL with a clean admin area, and I have experience with payment gateway integrations.', 2600],
  [1, 'f1', 'pending', 'Six years of full-stack work with the exact stack you list. I enjoy owning features from schema to interface.', null],
  [2, 'f2', 'accepted', 'I recently rebuilt a design system with tokens and accessibility notes for a health startup. Happy to share the case study.', 48],
  [3, 'f4', 'pending', 'Flutter is my main tool. I have shipped two delivery-tracking apps with live location and background updates.', 4000],
  [5, 'f3', 'accepted', 'Native Amharic speaker with translation experience for software products. I will follow your glossary closely.', 450],
  [6, 'f6', 'pending', 'I build cohort and retention dashboards in Power BI and can connect directly to your SQL database.', 32],
  [8, 'f7', 'shortlisted', 'Packaging and label design is my speciality. My portfolio includes coffee and tea brands.', 800],
];
for (const [pi, fk, status, letter, rate] of apps) {
  await conn.query('INSERT INTO applications (project_id, freelancer_id, cover_letter, proposed_rate, status) VALUES (?,?,?,?,?)',
    [projectIds[pi], ids[fk], letter, rate, status]);
}
const reviews = [
  [0, 'f1', 'c1', 5, 'Hana delivered a polished store ahead of schedule and explained every decision. Communication was excellent.'],
  [2, 'f2', 'c3', 5, 'Organised, thoughtful and quick. The design system documentation saved our developers a lot of time.'],
  [5, 'f3', 'c2', 4, 'Accurate translations with a natural tone. A few terms needed a second pass, handled quickly.'],
];
for (const [pi, fk, ck, rating, comment] of reviews) {
  await conn.query('INSERT INTO reviews (freelancer_id, client_id, project_id, rating, comment) VALUES (?,?,?,?,?)',
    [ids[fk], ids[ck], projectIds[pi], rating, comment]);
}

console.log('\nDemo data created. Log in with:');
console.log('  Admin       admin@freelio.dev            / Admin123!');
console.log('  Client      rahel@sheba-coffee.example   / Client123!');
console.log('  Freelancer  hana@freelio.example         / Freelancer123!');
await conn.end();
