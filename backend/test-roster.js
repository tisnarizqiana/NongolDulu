const db = require('./db/turso');

async function test() {
    const schedId = 3;
    const session_id = 1;
    
    const schedRes = await db.execute({ sql: 'SELECT class_id FROM schedules WHERE id = ?', args: [schedId] });
    const classId = schedRes.rows[0].class_id;

    console.log('Class ID:', classId);

    const result = await db.execute({
      sql: `SELECT u.id as user_id, u.nomor_induk, u.nama, a.id as attendance_id, a.status, a.created_at
            FROM class_enrollments ce
            JOIN users u ON ce.mahasiswa_id = u.id
            LEFT JOIN attendances a ON a.user_id = u.id AND a.session_id = ?
            WHERE ce.class_id = ?
            ORDER BY u.nama`,
      args: [session_id, classId]
    });
    
    console.log('Roster Rows:', result.rows);

    const totalSessionsRes = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM class_sessions WHERE schedule_id = ? AND date(tanggal) <= date("now", "localtime")',
      args: [schedId]
    });
    const totalSessions = parseInt(totalSessionsRes.rows[0].total) || 1;

    console.log('Total Sessions:', totalSessions);

    const attendanceStats = await db.execute({
      sql: `SELECT user_id, COUNT(*) as present_count 
            FROM attendances 
            WHERE schedule_id = ? AND status = 'Hadir' 
            GROUP BY user_id`,
      args: [schedId]
    });
    
    const statsMap = {};
    attendanceStats.rows.forEach(r => {
      statsMap[r.user_id] = r.present_count;
    });

    const enrichedRoster = result.rows.map(row => {
      const presentCount = statsMap[row.user_id] || 0;
      const percentage = Math.round((presentCount / totalSessions) * 100);
      return { ...row, percentage };
    });

    console.log('Enriched:', enrichedRoster);
}

test().catch(console.error);
