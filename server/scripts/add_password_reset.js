// Añade las columnas de recuperación de contraseña a `usuarios`.
// Usa ../db (respeta el .env): sirve en local y en producción.
const pool = require('../db');

async function setup() {
    try {
        const [code] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'reset_code'");
        if (code.length === 0) {
            await pool.query("ALTER TABLE usuarios ADD COLUMN reset_code VARCHAR(10) NULL");
            console.log("Columna 'reset_code' añadida a usuarios.");
        } else {
            console.log("La columna 'reset_code' ya existe.");
        }

        const [exp] = await pool.query("SHOW COLUMNS FROM usuarios LIKE 'reset_expires'");
        if (exp.length === 0) {
            await pool.query("ALTER TABLE usuarios ADD COLUMN reset_expires DATETIME NULL");
            console.log("Columna 'reset_expires' añadida a usuarios.");
        } else {
            console.log("La columna 'reset_expires' ya existe.");
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

setup();
