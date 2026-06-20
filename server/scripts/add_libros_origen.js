// Añade la columna `origen` a `libros` para distinguir libros del usuario vs del catálogo gratuito.
// Usa ../db (respeta el .env): sirve en local y en producción.
const pool = require('../db');

async function setup() {
    try {
        const [cols] = await pool.query("SHOW COLUMNS FROM libros LIKE 'origen'");
        if (cols.length === 0) {
            await pool.query("ALTER TABLE libros ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'usuario'");
            console.log("Columna 'origen' añadida a libros.");
        } else {
            console.log("La columna 'origen' ya existe.");
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

setup();
