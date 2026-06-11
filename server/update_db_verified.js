const pool = require('./db');

async function updateDb() {
    try {
        console.log("Añadiendo columna is_verified a la tabla usuarios...");
        try {
            await pool.query('ALTER TABLE usuarios ADD COLUMN is_verified BOOLEAN DEFAULT FALSE');
            console.log("Columna is_verified añadida.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("La columna is_verified ya existe.");
            } else {
                throw e;
            }
        }

        console.log("Verificando a la cuenta 'William' / 'test@gmail.com'...");
        const [res] = await pool.query('UPDATE usuarios SET is_verified = TRUE WHERE username = ? OR email = ?', ['William', 'test@gmail.com']);
        console.log("Filas actualizadas:", res.affectedRows);
        
        console.log("Proceso completado.");
    } catch (err) {
        console.error("Error actualizando la base de datos:", err);
    } finally {
        process.exit();
    }
}

updateDb();
