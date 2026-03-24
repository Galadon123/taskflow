const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const initDB = async () => {
    const connection = await pool.getConnection();
    try {
        await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type ENUM('task_assigned','task_updated','task_completed','project_invite') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON,
        is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_user_id (user_id),
                KEY idx_is_read (user_id, is_read)
      );
    `);
        console.log('Database initialized');
    } finally {
        connection.release();
    }
};

module.exports = { pool, initDB };
