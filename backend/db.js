"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
// Use CommonJS require for compatibility with Node.js CommonJS runtime
var mysql = require('mysql2/promise');
exports.pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'crm3',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
