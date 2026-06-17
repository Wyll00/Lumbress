// Crea la tabla de "palabras aprendidas" del diccionario del lector.
// Usa la conexión de ../db (respeta el .env): funciona en local y en producción.
const pool = require('../db');

async function setup() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS palabras_aprendidas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                libro_id INT NULL,
                palabra VARCHAR(190) NOT NULL,
                definicion TEXT,
                idioma VARCHAR(10) DEFAULT 'es',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_user_word (usuario_id, palabra),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('Tabla palabras_aprendidas creada correctamente.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

setup();
