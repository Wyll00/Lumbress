const mysql = require('mysql2/promise');

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'biblioteca_personal'
        });

        const [rows] = await connection.execute("SELECT VERSION()");
        console.log("MySQL Version for Node.js App:", rows);

        await connection.end();
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
