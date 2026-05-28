const pool = require('./db');

async function migrate() {
    try {
        console.log('Adding reading_hours to usuarios...');
        await pool.query('ALTER TABLE usuarios ADD COLUMN reading_hours INT DEFAULT 0;');
        console.log('Migration successful.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column reading_hours already exists. Skipping...');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        process.exit(0);
    }
}

migrate();
