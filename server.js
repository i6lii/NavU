import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(rootDir, 'data')
const distDir = path.join(rootDir, 'dist')
const databasePath = path.join(dataDir, 'navu.sqlite')
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001)
const roles = ['student', 'faculty', 'maintenance', 'transport', 'lab']
const requestServices = ['room', 'laboratory', 'maintenance', 'transport']
const allowedStatuses = ['submitted', 'review', 'approved', 'rejected', 'completed', 'cancelled']
const rolePermissions = {
  student: ['page:dashboard', 'page:planner', 'page:catalog', 'page:requests', 'page:maintenance', 'page:transport', 'page:profile', 'page:notifications', 'request:create:room', 'request:create:laboratory', 'request:create:maintenance', 'request:create:transport', 'request:read:own', 'request:cancel:own'],
  faculty: ['page:dashboard', 'page:planner', 'page:catalog', 'page:requests', 'page:maintenance', 'page:transport', 'page:profile', 'page:notifications', 'request:create:room', 'request:create:laboratory', 'request:create:maintenance', 'request:create:transport', 'request:read:own', 'request:cancel:own'],
  maintenance: ['page:dashboard', 'page:requests', 'page:department', 'page:maintenance', 'page:profile', 'page:notifications', 'request:read:maintenance', 'request:update:maintenance', 'request:comment:maintenance'],
  transport: ['page:dashboard', 'page:requests', 'page:department', 'page:transport', 'page:profile', 'page:notifications', 'request:read:transport', 'request:update:transport', 'request:comment:transport'],
  lab: ['page:dashboard', 'page:catalog', 'page:requests', 'page:department', 'page:resources', 'page:profile', 'page:notifications', 'request:read:laboratory', 'request:read:maintenance', 'request:update:laboratory', 'request:update:maintenance', 'request:comment:laboratory', 'request:comment:maintenance'],
}
const demoAccounts = [
  { username: 'yara', password: 'Yara@2026', fullName: 'Yara', role: 'student', universityId: 'NU-DEMO-1001', college: 'computer-science', department: null, specialization: 'Information Systems', jobTitle: null, mobile: '+966500000101', email: 'yara.demo@example.test' },
  { username: 'ahmed', password: 'Ahmed@2026', fullName: 'Dr. Ahmed', role: 'faculty', universityId: 'NU-DEMO-2001', college: 'computer-science', department: null, specialization: 'Computer Science', jobTitle: 'Faculty Member', mobile: '+966500000102', email: 'ahmed.demo@example.test' },
  { username: 'aljazi', password: 'Aljazi@2026', fullName: 'Aljazi', role: 'maintenance', universityId: null, college: null, department: 'Maintenance Department', specialization: null, jobTitle: 'Maintenance Employee', mobile: '+966500000103', email: 'aljazi.demo@example.test' },
  { username: 'sarah', password: 'Sarah@2026', fullName: 'Sarah', role: 'transport', universityId: null, college: null, department: 'Transportation Department', specialization: null, jobTitle: 'Transportation Employee', mobile: '+966500000104', email: 'sarah.demo@example.test' },
  { username: 'hajar', password: 'Hajar@2026', fullName: 'Hajar', role: 'lab', universityId: null, college: null, department: 'Laboratory Department', specialization: null, jobTitle: 'Laboratory Employee', mobile: '+966500000105', email: 'hajar.demo@example.test' },
]

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

const verifyPassword = (password, storedHash) => {
  const [saltHex, keyHex] = String(storedHash).split(':')
  if (!saltHex || !keyHex) return false
  const key = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(keyHex, 'hex')
  return key.length === expected.length && crypto.timingSafeEqual(key, expected)
}

const json = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

const readBody = (request, limit = 1024 * 1024) => new Promise((resolve, reject) => {
  let body = ''
  request.on('data', (chunk) => {
    body += chunk
    if (Buffer.byteLength(body) > limit) {
      reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }))
      request.destroy()
    }
  })
  request.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {})
    } catch {
      reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }))
    }
  })
  request.on('error', reject)
})

const saveDatabase = (database) => {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(databasePath, Buffer.from(database.export()))
}

const queryRows = (database, sql, params = []) => {
  const statement = database.prepare(sql)
  statement.bind(params)
  const rows = []
  while (statement.step()) rows.push(statement.getAsObject())
  statement.free()
  return rows
}

const seedDatabase = (database) => {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'maintenance', 'transport', 'lab')),
      university_id TEXT,
      college TEXT,
      department TEXT,
      specialization TEXT,
      job_title TEXT,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      photo_data TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      role TEXT NOT NULL,
      permission TEXT NOT NULL,
      PRIMARY KEY (role, permission)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'maintenance', 'transport', 'lab')),
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      owner_user_id INTEGER NOT NULL,
      college_id TEXT NOT NULL,
      service TEXT NOT NULL CHECK(service IN ('room', 'laboratory', 'maintenance', 'transport')),
      status TEXT NOT NULL CHECK(status IN ('submitted', 'review', 'approved', 'rejected', 'completed', 'cancelled')),
      request_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS bus_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      speed REAL,
      heading REAL,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
  database.run('DELETE FROM role_permissions')
  for (const role of roles) {
    for (const permission of rolePermissions[role]) {
      database.run('INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)', [role, permission])
    }
  }
  database.run(`UPDATE users SET status = 'inactive' WHERE lower(username) = 'asmaa' OR email = 'asmaa.demo@example.test'`)
  for (const account of demoAccounts) {
    database.run(
      `INSERT INTO users
        (username, password_hash, full_name, role, university_id, college, department, specialization, job_title, mobile, email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
       ON CONFLICT(username) DO UPDATE SET
         password_hash = excluded.password_hash,
         full_name = excluded.full_name,
         role = excluded.role,
         university_id = excluded.university_id,
         college = excluded.college,
         department = excluded.department,
         specialization = excluded.specialization,
         job_title = excluded.job_title,
         mobile = excluded.mobile,
         email = excluded.email,
         status = 'active'`,
      [account.username, hashPassword(account.password), account.fullName, account.role, account.universityId, account.college, account.department, account.specialization, account.jobTitle, account.mobile, account.email],
    )
  }
  database.run('DELETE FROM sessions WHERE expires_at <= ?', [Date.now()])
  saveDatabase(database)
}

const getUserByUsername = (database, username) => queryRows(database,
  `SELECT id, username, password_hash, full_name, role, university_id, college, department,
          specialization, job_title, mobile, email, photo_data, status
   FROM users WHERE lower(username) = lower(?) LIMIT 1`,
  [username.trim()],
)[0] ?? null

const getProfileById = (database, userId) => {
  const user = queryRows(database,
    `SELECT id, username, full_name, role, university_id, college, department,
            specialization, job_title, mobile, email, photo_data
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  )[0]
  if (!user) return null
  const permissions = queryRows(database, 'SELECT permission FROM role_permissions WHERE role = ?', [user.role]).map((row) => row.permission)
  return { ...user, permissions }
}

const hashSessionToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const getSession = (database, request) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const session = queryRows(database,
    'SELECT user_id, role FROM sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1',
    [hashSessionToken(token), Date.now()],
  )[0]
  return session ? { userId: session.user_id, role: session.role } : null
}

const hasPermission = (database, session, permission) =>
  queryRows(database, 'SELECT 1 AS allowed FROM role_permissions WHERE role = ? AND permission = ?', [session.role, permission]).length > 0

const publicRequest = (row) => {
  const data = JSON.parse(row.request_json)
  return { ...data, id: row.id, collegeId: row.college_id, service: row.service, status: row.status }
}

const requestVisibleTo = (database, session, row) => {
  if (row.owner_user_id === session.userId) return hasPermission(database, session, 'request:read:own')
  return hasPermission(database, session, `request:read:${row.service}`)
}

const serveStaticFile = (response, filePath) => {
  try {
    const content = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff',
      '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
    }
    response.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
    response.end(content)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
}

const main = async () => {
  const SQL = await initSqlJs({ locateFile: (file) => path.join(rootDir, 'node_modules', 'sql.js', 'dist', file) })
  const database = fs.existsSync(databasePath)
    ? new SQL.Database(new Uint8Array(fs.readFileSync(databasePath)))
    : new SQL.Database()
  seedDatabase(database)

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`)
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { 'Access-Control-Allow-Headers': 'Content-Type, Authorization' })
      response.end()
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      json(response, 200, { ok: true, database: path.basename(databasePath) })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      try {
        const body = await readBody(request)
        if (typeof body.username !== 'string' || typeof body.password !== 'string' || !body.username || !body.password) {
          json(response, 400, { message: 'اسم المستخدم وكلمة المرور مطلوبة.' })
          return
        }
        const user = getUserByUsername(database, body.username)
        if (!user || user.status !== 'active' || !verifyPassword(body.password, user.password_hash)) {
          json(response, 401, { message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' })
          return
        }
        const token = crypto.randomBytes(32).toString('hex')
        database.run(
          'INSERT INTO sessions (token_hash, user_id, role, expires_at) VALUES (?, ?, ?, ?)',
          [hashSessionToken(token), user.id, user.role, Date.now() + 30 * 24 * 60 * 60 * 1000],
        )
        saveDatabase(database)
        json(response, 200, { token, profile: getProfileById(database, user.id) })
      } catch (error) {
        json(response, error.statusCode ?? 400, { message: 'تعذر قراءة طلب تسجيل الدخول.' })
      }
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
      if (token) {
        database.run('DELETE FROM sessions WHERE token_hash = ?', [hashSessionToken(token)])
        saveDatabase(database)
      }
      json(response, 200, { success: true })
      return
    }

    const session = getSession(database, request)
    if (url.pathname.startsWith('/api/') && !session &&
        !(request.method === 'GET' && url.pathname === '/api/health') &&
        !(request.method === 'POST' && url.pathname === '/api/auth/login')) {
      json(response, 401, { message: 'يرجى تسجيل الدخول.' })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/auth/session') {
      const profile = getProfileById(database, session.userId)
      if (!profile) {
        json(response, 401, { message: 'الحساب غير موجود.' })
        return
      }
      json(response, 200, { profile })
      return
    }

    if (url.pathname === '/api/profile' && request.method === 'GET') {
      json(response, 200, { profile: getProfileById(database, session.userId) })
      return
    }

    if (url.pathname === '/api/profile' && request.method === 'PATCH') {
      try {
        const body = await readBody(request, 800 * 1024)
        const updates = []
        const values = []
        if (typeof body.mobile === 'string') {
          const mobile = body.mobile.trim()
          if (mobile.length < 7 || mobile.length > 24 || !/^[+\d\s()-]+$/.test(mobile)) {
            json(response, 400, { message: 'رقم الجوال غير صالح.' })
            return
          }
          updates.push('mobile = ?')
          values.push(mobile)
        }
        if (typeof body.photoData === 'string') {
          if (body.photoData.length > 600 * 1024 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.photoData)) {
            json(response, 400, { message: 'الصورة غير صالحة أو حجمها كبير.' })
            return
          }
          updates.push('photo_data = ?')
          values.push(body.photoData)
        }
        if (!updates.length) {
          json(response, 400, { message: 'لا توجد بيانات مسموح بتحديثها.' })
          return
        }
        database.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...values, session.userId])
        saveDatabase(database)
        json(response, 200, { profile: getProfileById(database, session.userId) })
      } catch (error) {
        json(response, error.statusCode ?? 400, { message: 'تعذر تحديث الملف الشخصي.' })
      }
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/requests') {
      const all = queryRows(database, 'SELECT id, owner_user_id, college_id, service, status, request_json FROM requests ORDER BY created_at DESC, rowid DESC')
      json(response, 200, { requests: all.filter((row) => requestVisibleTo(database, session, row)).map(publicRequest) })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/requests') {
      try {
        const body = await readBody(request, 800 * 1024)
        if (!requestServices.includes(body.service) || !hasPermission(database, session, `request:create:${body.service}`)) {
          json(response, 403, { message: 'ليس لديك صلاحية إنشاء هذا الطلب.' })
          return
        }
        if (typeof body.collegeId !== 'string' || typeof body.title !== 'string' || !body.title.trim() ||
            typeof body.resource !== 'string' || typeof body.date !== 'string' || typeof body.time !== 'string') {
          json(response, 400, { message: 'بيانات الطلب غير مكتملة.' })
          return
        }
        if (!['engineering', 'computer-science', 'science-arts'].includes(body.collegeId)) {
          json(response, 400, { message: 'موقع الفعالية غير صالح.' })
          return
        }
        if (typeof body.attachmentData === 'string' &&
            (body.attachmentData.length > 600 * 1024 ||
             !/^data:(application\/pdf|image\/(jpeg|png|webp));base64,[A-Za-z0-9+/=]+$/.test(body.attachmentData))) {
          json(response, 400, { message: 'المرفق غير صالح أو حجمه كبير.' })
          return
        }
        const id = `NU-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
        const safeData = {
          title: body.title.trim(), resource: body.resource, date: body.date, time: body.time,
          attendees: Number.isFinite(Number(body.attendees)) ? Number(body.attendees) : 0,
          owner: getProfileById(database, session.userId).full_name,
          department: body.service === 'maintenance' ? 'Maintenance' : body.service === 'transport' ? 'Transportation' : body.service === 'laboratory' ? 'Laboratories' : 'Facilities',
          notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : undefined,
          attachmentName: typeof body.attachmentName === 'string' ? body.attachmentName.slice(0, 180) : undefined,
          attachmentData: typeof body.attachmentData === 'string' && body.attachmentData.length <= 600 * 1024 ? body.attachmentData : undefined,
        }
        database.run(
          'INSERT INTO requests (id, owner_user_id, college_id, service, status, request_json) VALUES (?, ?, ?, ?, ?, ?)',
          [id, session.userId, body.collegeId, body.service, 'submitted', JSON.stringify(safeData)],
        )
        saveDatabase(database)
        const row = queryRows(database, 'SELECT id, owner_user_id, college_id, service, status, request_json FROM requests WHERE id = ?', [id])[0]
        json(response, 201, { request: publicRequest(row) })
      } catch (error) {
        json(response, error.statusCode ?? 400, { message: 'تعذر حفظ الطلب.' })
      }
      return
    }

    const requestMatch = url.pathname.match(/^\/api\/requests\/([^/]+)$/)
    if (requestMatch && request.method === 'PATCH') {
      try {
        const id = decodeURIComponent(requestMatch[1])
        const row = queryRows(database, 'SELECT id, owner_user_id, college_id, service, status, request_json FROM requests WHERE id = ?', [id])[0]
        if (!row) {
          json(response, 404, { message: 'الطلب غير موجود.' })
          return
        }
        const body = await readBody(request)
        if (typeof body.comment === 'string' && body.comment.trim() &&
            body.comment.trim().length <= 1000 &&
            hasPermission(database, session, `request:comment:${row.service}`)) {
          const requestData = JSON.parse(row.request_json)
          requestData.comments = [...(requestData.comments ?? []), body.comment.trim()]
          database.run('UPDATE requests SET request_json = ? WHERE id = ?', [JSON.stringify(requestData), id])
        } else if (row.owner_user_id === session.userId && body.status === 'cancelled' &&
            hasPermission(database, session, 'request:cancel:own') && ['submitted', 'review'].includes(row.status)) {
          database.run('UPDATE requests SET status = ? WHERE id = ?', ['cancelled', id])
        } else if (allowedStatuses.includes(body.status) &&
            hasPermission(database, session, `request:update:${row.service}`) &&
            (['submitted', 'review'].includes(row.status) && ['review', 'approved', 'rejected'].includes(body.status) ||
             row.status === 'approved' && body.status === 'completed') &&
            !(session.role === 'lab' && !['laboratory', 'maintenance'].includes(row.service)) &&
            !(session.role === 'transport' && row.service !== 'transport')) {
          database.run('UPDATE requests SET status = ? WHERE id = ?', [body.status, id])
        } else {
          json(response, 403, { message: 'ليس لديك صلاحية تعديل هذا الطلب.' })
          return
        }
        saveDatabase(database)
        const updated = queryRows(database, 'SELECT id, owner_user_id, college_id, service, status, request_json FROM requests WHERE id = ?', [id])[0]
        json(response, 200, { request: publicRequest(updated) })
      } catch (error) {
        json(response, error.statusCode ?? 400, { message: 'تعذر تحديث الطلب.' })
      }
      return
    }

    if (url.pathname.startsWith('/api/')) {
      json(response, 404, { message: 'المسار غير موجود.' })
      return
    }

    if (request.method === 'GET') {
      const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname
      const filePath = path.resolve(distDir, `.${requestedPath}`)
      if (filePath.startsWith(`${distDir}${path.sep}`) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        serveStaticFile(response, filePath)
        return
      }
      if (fs.existsSync(path.join(distDir, 'index.html'))) {
        serveStaticFile(response, path.join(distDir, 'index.html'))
        return
      }
    }
    json(response, 404, { message: 'المسار غير موجود.' })
  })

  server.listen(port, process.env.HOST ?? '0.0.0.0', () => {
    console.log(`NavU API listening on port ${port}`)
    console.log(`SQLite database: ${databasePath}`)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
