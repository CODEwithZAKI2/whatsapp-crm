// Use CommonJS require for compatibility with Node.js CommonJS runtime
const mysql = require('mysql2/promise');

export const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'crm3',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
