const mysql = require('mysql2/promise');

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });

        console.log("Connected to MySQL.");

        // Find where the 'usuarios' table is
        const [rows] = await connection.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'usuarios'");
        console.log("Locations of 'usuarios' table:");
        console.table(rows);

        // Show all tables in 'biblioteca_personal'
        const [tables] = await connection.execute("SHOW TABLES FROM biblioteca_personal");
        console.log("Tables in 'biblioteca_personal':");
        console.table(tables);

        await connection.end();
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
