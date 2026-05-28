const mysql = require('mysql2/promise');

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'biblioteca_personal'
        });

        const [rows] = await connection.execute("SHOW VARIABLES LIKE 'port'");
        console.log("MySQL Port for Node.js App:", rows);

        const [tables] = await connection.execute("SHOW TABLES");
        console.log("Tables:", tables.map(t => Object.values(t)[0]));

        await connection.end();
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
