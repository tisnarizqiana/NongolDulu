const db = require('./db/turso');
db.execute({
  sql: "SELECT u.id as user_id, u.nomor_induk, u.nama, a.id as attendance_id, a.status, a.created_at FROM class_enrollments ce JOIN users u ON ce.mahasiswa_id = u.id LEFT JOIN attendances a ON a.user_id = u.id AND a.session_id = 1 WHERE ce.class_id = 1 ORDER BY u.nama"
}).then(res => console.log(res.rows)).catch(console.error);
