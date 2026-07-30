// server/db.js
import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise({});

// Fallback connection string configuration
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ CRITICAL: DATABASE_URL is missing from your .env file!");
    process.exit(1);
}

// Instantiate the database connection instance
export const db = pgp(connectionString);

// Test database connectivity instantly upon module import
db.connect()
    .then(obj => {
        console.log("🐘 PostgreSQL cluster securely linked to app engine.");
        obj.done(); // Success! Release the connection back to the pool instantly
    })
    .catch(error => {
        console.error("❌ Database connection error:", error.message || error);
    });