// Crea la tabla de tráfico (peticiones + páginas vistas, con país e IP).
// Usa ../db (respeta el .env): sirve en local y en producción.
const pool = require('../db');

async function setup() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trafico (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                tipo VARCHAR(12) NOT NULL DEFAULT 'request',
                metodo VARCHAR(8),
                ruta VARCHAR(255),
                status INT,
                ip VARCHAR(45),
                pais VARCHAR(80),
                pais_codigo VARCHAR(2),
                usuario_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_created (created_at),
                INDEX idx_tipo (tipo),
                INDEX idx_pais (pais_codigo),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('Tabla trafico creada correctamente.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

setup();
