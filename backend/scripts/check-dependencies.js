/**
 * Pre-deploy dependency checker.
 * Verifies that every required npm package is listed in package.json.
 * Run: node backend/scripts/check-dependencies.js
 */

const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// Every external (non-built-in) package used in backend/ code
const required = [
    'bcrypt',
    'cookie-parser',
    'cors',
    'dotenv',
    'express',
    'helmet',
    'jsonwebtoken',
    'passport',
    'passport-google-oauth20',
    'pg',
    'qrcode',
    'resend',
    'speakeasy',
    'ua-parser-js'
];

let allGood = true;

required.forEach(name => {
    if (pkg.dependencies && pkg.dependencies[name]) {
        console.log(`  ✅  ${name}`);
    } else {
        console.error(`  ❌  ${name} — MISSING from package.json!`);
        allGood = false;
    }
});

console.log('');
if (allGood) {
    console.log('✅ All dependencies present. Safe to deploy.');
} else {
    console.log('❌ Fix missing dependencies before deploying!');
    process.exit(1);
}
