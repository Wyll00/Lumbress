// Crea la tabla de registro de errores (tipo Sentry, propia).
// Usa ../db (respeta el .env): sirve en local y en producción.
const pool = require('../db');

async function setup() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS errores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                huella VARCHAR(64) NOT NULL,
                mensaje TEXT,
                stack TEXT,
                ruta VARCHAR(255),
                metodo VARCHAR(8),
                status INT,
                usuario_id INT NULL,
                veces INT NOT NULL DEFAULT 1,
                primera_vez TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultima_vez TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resuelto TINYINT NOT NULL DEFAULT 0,
                UNIQUE KEY uniq_huella (huella),
                INDEX idx_resuelto (resuelto),
                INDEX idx_ultima (ultima_vez)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('Tabla errores creada correctamente.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

setup();
