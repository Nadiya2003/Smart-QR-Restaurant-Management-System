import pool from './src/config/db.js';

async function checkTime() {
    try {
        const [[{ curDate, now, local_tz }]] = await pool.query('SELECT CURDATE() as curDate, NOW() as now, @@session.time_zone as local_tz');
        console.log('DB CURDATE:', curDate);
        console.log('DB NOW:', now);
        console.log('DB TZ:', local_tz);
        console.log('SYSTEM NOW:', new Date().toISOString());
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkTime();
