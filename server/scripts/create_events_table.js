const pool = require('./db');

async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS calendar_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                fecha DATE NOT NULL,
                hora TIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Tabla calendar_events creada exitosamente');
    } catch (err) {
        console.error('Error creando tabla:', err);
    } finally {
        process.exit(0);
    }
}

createTable();
