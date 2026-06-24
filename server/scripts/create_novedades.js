// Crea la tabla "novedades": escaparate de promoción de libros.
// Los autores suben la ficha (título, autor, portada, sinopsis) y el enlace
// donde conseguir el libro; NO se aloja el libro, solo se le da visibilidad.
// Usa ../db (respeta el .env): sirve en local y en producción.
const pool = require('../db');

async function setup() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS novedades (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                autor VARCHAR(160) NOT NULL,
                sinopsis TEXT,
                portada_url VARCHAR(500),
                enlace VARCHAR(500) NOT NULL,
                genero VARCHAR(80),
                estado VARCHAR(20) NOT NULL DEFAULT 'aprobado',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_estado_created (estado, created_at),
                INDEX idx_usuario (usuario_id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('Tabla novedades creada correctamente.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

setup();
