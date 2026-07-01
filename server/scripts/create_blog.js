// Crea la tabla "blog": artículos editoriales de Lumbres (los escriben los admins).
// Usa ../db (respeta el .env): sirve en local y en producción.
const pool = require('../db');

async function setup() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS blog (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                resumen VARCHAR(400),
                contenido MEDIUMTEXT NOT NULL,
                portada_url VARCHAR(500),
                categoria VARCHAR(80),
                estado VARCHAR(20) NOT NULL DEFAULT 'publicado',
                auto_generado TINYINT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_estado_created (estado, created_at),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('Tabla blog creada correctamente.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

setup();
