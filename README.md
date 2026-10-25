# ภาวนาสติ (Vipassana Hub)

ระบบการเรียนออนไลน์หลักสูตรสติปัฏฐาน ๔ สำหรับผู้เรียน ผู้สอน และผู้ดูแลระบบ

- `client/` หน้าเว็บ Next.js (App Router, TypeScript)
- `server/` API ด้วย Node.js + Express + MongoDB (TypeScript)
- `proxy/` Nginx รับทุกคำขอที่พอร์ต 80 แล้วส่งต่อให้ client และ server
- `docker-compose.yml` รันทั้งสามส่วนพร้อมกัน

```
Browser ──► Nginx :80 ──┬─ /api/*  ──► server :4000 (Node.js + MongoDB)
                        └─ /*      ──► client :3000 (Next.js)
```

## สิ่งที่ระบบทำได้

**ผู้เรียน**
- สมัครสมาชิก (ยอมรับ PDPA) และเข้าสู่ระบบ
- เรียนสองรูปแบบพร้อมกัน: **เนื้อหา** (บทที่ 1, 2, 3 ...) และ **วิดีโอ** (ตอนที่ 1, 2, 3 ...)
- แต่ละบทมี **แบบทดสอบก่อนเรียน** (บังคับ) → เนื้อหาหรือวิดีโอ → **แบบทดสอบหลังเรียน** (ต้องได้ตามคะแนนผ่าน)
- วิดีโอต้องดูให้ถึงเกณฑ์ (ค่าเริ่มต้น 80%) ก่อนกดเรียนจบ ระบบจำตำแหน่งที่หยุดไว้ และหยุดวิดีโอเองเมื่อเปลี่ยนแท็บหรือไม่มีการใช้งาน
- บทถัดไปเปิดเมื่อบทก่อนหน้าในรูปแบบเดียวกันผ่านแล้ว
- เรียนครบทุกบททั้งสองรูปแบบ จึงทำ **แบบทดสอบรวม** ได้ (คะแนนผ่าน 70%)

**ผู้สอน (teacher)**
- สร้าง แก้ไข และเผยแพร่บทเรียนของตัวเอง ใช้ตัวแก้ไข Markdown พร้อมแถบเครื่องมือ
- ออกแบบข้อสอบก่อนเรียนและหลังเรียนได้ (คัดลอกชุดจากก่อนเรียนไปหลังเรียนได้)
- อัปโหลดวิดีโอ MP4 (ไม่เกิน `MAX_VIDEO_MB`)
- ดูรายชื่อผู้เรียนและความคืบหน้ารายบท (เปอร์เซ็นต์ของแต่ละขั้น) โดยไม่เห็นอีเมลหรือเบอร์โทร

**ผู้ดูแลระบบ (admin)**
- ทำได้ทุกอย่างของผู้สอน และเผยแพร่บทเรียนของใครก็ได้
- จัดการบทบาทของผู้ใช้ (ยกเว้นตัวเอง)

**บทบาท** เก็บไว้ในฐานข้อมูลและตรวจที่ server ทุกคำขอ ผู้สมัครใหม่เป็น `student` เสมอ

## เทคโนโลยี

| ส่วน | เครื่องมือ |
|---|---|
| หน้าเว็บ | Next.js 16, React 19, TypeScript, `@mdxeditor/editor`, `react-markdown` |
| API | Express 5, MongoDB driver 6, `jose` (JWT ใน cookie), `bcryptjs`, `multer`, `pino` |
| ฐานข้อมูล | MongoDB (ต้องมีจัดเตรียมไว้เอง ไม่อยู่ใน docker-compose) |
| Proxy | Nginx 1.27 |

## เริ่มต้นใช้งาน

### 1. เตรียมไฟล์ตั้งค่า

```bash
cp server/.env.example server/.env
```

แก้ค่าใน `server/.env`

| ตัวแปร | ความหมาย |
|---|---|
| `PORT` | พอร์ตของ API (ค่าเริ่มต้น 4000) |
| `MONGODB_URI` | การเชื่อมต่อ MongoDB ถ้า user สร้างใน database `admin` ต้องมี `?authSource=admin` |
| `JWT_SECRET` | ใช้ลงนาม session ยาวอย่างน้อย 32 ตัวอักษร เปลี่ยนแล้วผู้ใช้ทุกคนจะต้องเข้าสู่ระบบใหม่ |
| `CORS_ORIGIN` | โดเมนที่อนุญาตให้เรียก API ข้ามโดเมน (ถ้า client เรียกผ่าน proxy ไม่ต้องตั้ง) |
| `COOKIE_SECURE` | ตั้งเป็น `true` เมื่อใช้ HTTPS |
| `LOG_LEVEL` | ระดับ log: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` (ค่าเริ่มต้น `info`) |
| `UPLOAD_DIR` | โฟลเดอร์เก็บวิดีโอที่อัปโหลด (ค่าเริ่มต้น `server/uploads`) |
| `MAX_VIDEO_MB` | ขนาดไฟล์วิดีโอสูงสุด (ค่าเริ่มต้น 50 MB) ค่า nginx ต้องมากกว่านี้เสมอ |

ห้าม commit ไฟล์ `.env` (ถูกตั้งให้ `.gitignore` ไว้แล้ว)

### 2A. รันด้วย Docker (แนะนำสำหรับใช้งานจริง)

```bash
docker compose up -d --build
```

- เปิด http://localhost หน้าแรกจะพาไปหน้าเข้าสู่ระบบ
- ตรวจสถานะ API: http://localhost/api/health
- วิดีโอที่อัปโหลดเก็บใน volume ชื่อ `uploads` ไม่หายเมื่อ rebuild
- ดู log: `docker compose logs -f`

> หมายเหตุ: `docker-compose.yml` ไม่มี MongoDB ให้ตั้งค่า `MONGODB_URI` ให้ชี้ไปยังฐานข้อมูลที่มีอยู่แล้ว

### 2B. รันแบบพัฒนาโดยไม่ใช้ Docker

ต้องใช้ Node.js 22 ขึ้นไป และมี MongoDB ที่เข้าถึงได้

```bash
# เทอร์มินัลที่ 1: API ที่พอร์ต 4000 (รีสตาร์ตให้เองเมื่อแก้โค้ด)
cd server
npm install
npm run dev

# เทอร์มินัลที่ 2: หน้าเว็บที่พอร์ต 3000
cd client
npm install
npm run dev
```

เปิด http://localhost:3000 หน้าเว็บจะส่งคำขอ `/api/*` ไปยัง API ที่ `API_INTERNAL_URL` (ค่าเริ่มต้น `http://localhost:4000`) โดยอัตโนมัติ

## คำสั่งที่ใช้บ่อย

**server/**

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน API แบบพัฒนา รีสตาร์ตเมื่อแก้โค้ด |
| `npm run build` | คอมไพล์ TypeScript ไปที่ `dist/` |
| `npm start` | รันจาก `dist/` (ต้อง build ก่อน) |
| `npm run typecheck` | ตรวจ type โดยไม่สร้างไฟล์ |
| `npm run db:check` | ทดสอบการเชื่อมต่อ MongoDB |
| `npm run role -- <อีเมล> <student\|teacher\|admin>` | เปลี่ยนบทบาทของบัญชี ใช้สร้างผู้ดูแลระบบคนแรก |

**client/**

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รันหน้าเว็บแบบพัฒนา |
| `npm run build` | build สำหรับใช้งานจริง |
| `npm run lint` | ตรวจโค้ด |

## การสร้างผู้ดูแลระบบคนแรก

1. สมัครสมาชิกด้วยอีเมลที่ต้องการผ่านหน้าเว็บ
2. รันคำสั่งเปลี่ยนบทบาทใน `server/`:
   ```bash
   npm run role -- you@example.com admin
   ```
3. ออกจากระบบแล้วเข้าใหม่

## โครงสร้างโปรเจกต์

```
client/
  src/app/
    login/, register/, pdpa/          หน้าเข้าสู่ระบบ สมัคร นโยบาย PDPA
    (app)/dashboard/                  หน้าหลักผู้เรียน ความคืบหน้าและขั้นตอนจบหลักสูตร
    (app)/lesson/                     รายการบทเรียนทั้งสองรูปแบบ
    (app)/lesson/view/                หน้าเรียนบทหนึ่ง (ก่อนเรียน เนื้อหา/วิดีโอ หลังเรียน)
    (app)/final-exam/                 แบบทดสอบรวม
    (app)/admin/                      แดชบอร์ดผู้สอน/ผู้ดูแล
    (app)/admin/lessons/              รายการและตัวแก้ไขบทเรียน
    (app)/admin/learners/detail/      ความคืบหน้ารายคน
  src/components/                     ส่วนประกอบที่ใช้ซ้ำ (ตัวแก้ไข Markdown, ตัวเล่นวิดีโอ ฯลฯ)
  src/lib/                            API helper, ชนิดข้อมูล, ฟังก์ชันช่วย
  src/proxy.ts                        ตรวจว่ามี cookie ก่อนเข้าหน้าที่ต้องล็อกอิน

server/
  src/app.ts, src/server.ts           ตั้งค่า Express และจุดเริ่มต้นโปรแกรม
  src/routes/                         เส้นทาง API
  src/controllers/                    รับคำขอและตอบกลับ
  src/services/                       กฎทางธุรกิจ (สมัคร login บทเรียน ความคืบหน้า แบบทดสอบรวม)
  src/models/                         การเข้าถึงฐานข้อมูล
  src/validators/                     ตรวจข้อมูลที่ส่งเข้ามา
  src/authz/roles.ts                  บทบาทและสิทธิ์ทั้งหมดอยู่ที่นี่
  src/middleware/                     ตรวจสิทธิ์ อัปโหลดไฟล์ ตอบ error และบันทึก request
  scripts/                            คำสั่งช่วยงาน (db-check, set-role)

proxy/nginx.conf                      กติกาการส่งต่อคำขอและขนาดไฟล์สูงสุด
docker-compose.yml                    รันทุกส่วนพร้อมกัน
```

## API หลัก

| เส้นทาง | สิทธิ์ | หน้าที่ |
|---|---|---|
| `POST /api/auth/register`, `login`, `logout` | ทุกคน | สมัคร เข้า/ออกจากระบบ |
| `GET /api/auth/me` | ผู้ล็อกอิน | ข้อมูลบัญชีปัจจุบัน |
| `GET /api/courses`, `GET /api/course` | ผู้เรียน | บทเรียนที่เปิดอยู่และความคืบหน้ารวม |
| `GET /api/lessons/:id` | ผู้เรียน | เนื้อหาตามขั้นที่ทำแล้ว (ไม่มีเฉลย) |
| `POST /api/lessons/:id/pretest`, `content-complete`, `watch-progress`, `posttest` | ผู้เรียน | บันทึกความคืบหน้าของบท |
| `POST /api/final-exam`, `POST /api/final-exam/:id/submit` | ผู้เรียน | แบบทดสอบรวม |
| `GET/POST /api/admin/lessons`, `PATCH /api/admin/lessons/:id` | ผู้สอน, ผู้ดูแล | จัดการบทเรียน |
| `POST /api/admin/lessons/:id/video` | ผู้สอน, ผู้ดูแล | อัปโหลดวิดีโอ MP4 |
| `POST /api/admin/lessons/:id/publish`, `unpublish` | ผู้สอน (ของตัวเอง), ผู้ดูแล | เผยแพร่บทเรียน |
| `GET /api/learners`, `GET /api/learners/:id/progress` | ผู้สอน, ผู้ดูแล | รายชื่อและความคืบหน้าผู้เรียน |
| `GET/PATCH /api/admin/users...` | ผู้ดูแล | จัดการบทบาท |
| `GET /api/media/videos/:name` | ผู้ล็อกอิน | ดูวิดีโอที่อัปโหลด (รองรับการเลื่อนดู) |
| `GET /api/health` | ทุกคน | ตรวจว่า API และฐานข้อมูลทำงานอยู่ |

## กติกาสำคัญ (ปรับได้ในโค้ด)

- **น้ำหนักคะแนนของบท:** ก่อนเรียน 20%, เนื้อหา 40%, หลังเรียน 40% (`server/src/services/progress-summary.ts`)
- **เกณฑ์ดูวิดีโอ:** ตั้งเป็นรายบท ค่าเริ่มต้น 80%
- **คะแนนผ่านหลังเรียน:** ตั้งเป็นรายบท ค่าเริ่มต้น 70%
- **แบบทดสอบรวม:** สุ่ม 20 ข้อ คะแนนผ่าน 70% (`server/src/services/course.service.ts`)
- **หยุดวิดีโออัตโนมัติ:** เมื่อเปลี่ยนแท็บ หรือไม่มีการใช้งาน 10 นาที (`client/src/app/(app)/lesson/view/page.tsx`)
- **ข้อความ "ไม่เกิน" ของฟิลด์ต่าง ๆ:** ดูที่ `server/src/validators/`

## ข้อจำกัดที่ทราบ

- เกณฑ์การดูวิดีโอและตำแหน่งที่หยุดเป็นค่าที่เบราว์เซอร์ส่งมา จึงเป็นการช่วยตรวจ ไม่ใช่การป้องกันการโกงที่แน่นหนา
- วิดีโอต้องเป็นไฟล์ MP4 ที่อัปโหลดเข้าระบบ ลิงก์ภายนอก (เช่น YouTube) ระบบบันทึกการดูไม่ได้ จึงเรียนจบไม่ได้
- ยังไม่มีใบประกาศนียบัตร (จะทำในเฟสถัดไป)
- วิดีโอเก็บบนเครื่องเซิร์ฟเวอร์เดียว ถ้ามีจำนวนมากควรย้ายไป object storage
- บทแบบเนื้อหาไม่มีเปอร์เซ็นต์การอ่าน มีเพียงสถานะอ่านจบ

## การแก้ปัญหาเบื้องต้น

| อาการ | สิ่งที่ควรตรวจ |
|---|---|
| API เริ่มไม่ได้ ขึ้น `JWT_SECRET must be set` | ตั้ง `JWT_SECRET` ใน `server/.env` อย่างน้อย 32 ตัวอักษร |
| เชื่อมฐานข้อมูลไม่ได้ / `Authentication failed` | ตรวจ `MONGODB_URI` และ `?authSource=admin` |
| อัปโหลดวิดีโอแล้วขึ้น 413 หรือค้าง | ตรวจ `client_max_body_size` ใน `proxy/nginx.conf` และ `proxyClientMaxBodySize` ใน `client/next.config.ts` |
| หน้าไม่อัปเดตตามโค้ดที่แก้ | ดูว่าเทอร์มินัลรัน `next dev` ไม่ใช่ `next start` และรีสตาร์ตเมื่อแก้ไฟล์ตั้งค่า |
| ข้อมูลไม่เข้า (ลำดับซ้ำ) | บทเรียนแต่ละ `track + order` ต้องไม่ซ้ำกัน |

## การเก็บข้อมูลส่วนบุคคล

ดูนโยบายที่หน้า `/pdpa` ของระบบ ก่อนเปิดใช้งานจริงต้องกรอกช่องในวงเล็บเหลี่ยม (ชื่อหน่วยงาน ผู้ควบคุมข้อมูล ระยะเวลาเก็บ) และให้ผู้เชี่ยวชาญตรวจ โดยเฉพาะข้อมูลประสบการณ์ปฏิบัติซึ่งอาจถือเป็นข้อมูลอ่อนไหว

---

# Vipassana Hub (ภาวนาสติ)

An online learning platform for the Four Foundations of Mindfulness (Satipaṭṭhāna) course, for learners, teachers and administrators.

- `client/` Web front end: Next.js (App Router, TypeScript)
- `server/` API: Node.js + Express + MongoDB (TypeScript)
- `proxy/` Nginx, listens on port 80 and forwards requests to the client and the server
- `docker-compose.yml` runs all three parts together

```
Browser ──► Nginx :80 ──┬─ /api/*  ──► server :4000 (Node.js + MongoDB)
                        └─ /*      ──► client :3000 (Next.js)
```

## What the system does

**Learners**
- Register (accepting the PDPA notice) and sign in
- Study two formats side by side: **Reading** (lesson 1, 2, 3 ...) and **Video** (episode 1, 2, 3 ...)
- Each lesson has a **pre-test** (required) → content or video → **post-test** (must reach the passing score)
- A video must be watched to the required share (default 80%) before the lesson can be marked finished. The system remembers where the learner stopped and pauses the video when the learner leaves the tab or stops using the page
- The next lesson in the same format opens once the previous one is passed
- After every lesson in both formats is passed, the learner can take the **final exam** (passing score 70%)

**Teachers**
- Create, edit and publish their own lessons, using a Markdown editor with a formatting toolbar
- Design pre-tests and post-tests (a post-test can be copied from the pre-test and then edited separately)
- Upload MP4 videos (up to `MAX_VIDEO_MB`)
- See the learner list and each learner's progress per lesson (percentage per step), without seeing email addresses or phone numbers

**Administrators**
- Everything a teacher can do, and can publish any teacher's lesson
- Change user roles (except their own)

**Roles** are stored in the database and checked on the server for every request. New sign-ups always get the `student` role.

## Technology

| Part | Tools |
|---|---|
| Web front end | Next.js 16, React 19, TypeScript, `@mdxeditor/editor`, `react-markdown` |
| API | Express 5, MongoDB driver 6, `jose` (JWT in a cookie), `bcryptjs`, `multer`, `pino` |
| Database | MongoDB (you provide it; it is not part of docker-compose) |
| Proxy | Nginx 1.27 |

## Getting started

### 1. Prepare the settings file

```bash
cp server/.env.example server/.env
```

Edit `server/.env`

| Variable | Meaning |
|---|---|
| `PORT` | API port (default 4000) |
| `MONGODB_URI` | MongoDB connection string. If the user was created in the `admin` database, include `?authSource=admin` |
| `JWT_SECRET` | Signs sessions. Use at least 32 characters. Changing it signs every user out |
| `CORS_ORIGIN` | Origins allowed to call the API across domains (not needed when requests go through the proxy) |
| `COOKIE_SECURE` | Set to `true` when served over HTTPS |
| `LOG_LEVEL` | Log level: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` (default `info`) |
| `UPLOAD_DIR` | Folder for uploaded videos (default `server/uploads`) |
| `MAX_VIDEO_MB` | Largest video size in MB (default 50). The nginx limit must always be higher |

Never commit `.env` (it is already in `.gitignore`).

### 2A. Run with Docker (recommended for real use)

```bash
docker compose up -d --build
```

- Open http://localhost. The home page redirects to the sign-in page
- Check API health: http://localhost/api/health
- Uploaded videos are kept in a volume named `uploads`, so they survive rebuilds
- View logs: `docker compose logs -f`

> Note: `docker-compose.yml` does not include MongoDB. Point `MONGODB_URI` at an existing database.

### 2B. Run for development without Docker

You need Node.js 22 or later and a reachable MongoDB.

```bash
# Terminal 1: API on port 4000 (restarts automatically when code changes)
cd server
npm install
npm run dev

# Terminal 2: web front end on port 3000
cd client
npm install
npm run dev
```

Open http://localhost:3000. The web front end forwards `/api/*` to the API at `API_INTERNAL_URL` (default `http://localhost:4000`) automatically.

## Common commands

**server/**

| Command | What it does |
|---|---|
| `npm run dev` | Run the API in development mode, restarting on code changes |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run from `dist/` (build first) |
| `npm run typecheck` | Check types without writing files |
| `npm run db:check` | Test the MongoDB connection |
| `npm run role -- <email> <student\|teacher\|admin>` | Change an account's role. Used to create the first administrator |

**client/**

| Command | What it does |
|---|---|
| `npm run dev` | Run the web front end in development mode |
| `npm run build` | Build for production |
| `npm run lint` | Lint the code |

## Creating the first administrator

1. Register an account with the email you want, through the website
2. In `server/`, run:
   ```bash
   npm run role -- you@example.com admin
   ```
3. Sign out and sign in again

## Project structure

```
client/
  src/app/
    login/, register/, pdpa/          Sign in, sign up, privacy notice
    (app)/dashboard/                  Learner home: progress and course completion steps
    (app)/lesson/                     Lesson list for both formats
    (app)/lesson/view/                One lesson (pre-test, content/video, post-test)
    (app)/final-exam/                 Course final exam
    (app)/admin/                      Teacher/administrator dashboard
    (app)/admin/lessons/              Lesson list and editor
    (app)/admin/learners/detail/      Progress for one learner
  src/components/                     Reusable parts (Markdown editor, video player, etc.)
  src/lib/                            API helper, types, utility functions
  src/proxy.ts                        Checks for a session cookie before protected pages

server/
  src/app.ts, src/server.ts           Express setup and program entry point
  src/routes/                         API routes
  src/controllers/                    Receive requests and send responses
  src/services/                       Business rules (accounts, lessons, progress, final exam)
  src/models/                         Database access
  src/validators/                     Checks incoming data
  src/authz/roles.ts                  All roles and permissions are defined here
  src/middleware/                     Permission checks, video upload, error responses, request logging
  scripts/                            Helper scripts (db-check, set-role)

proxy/nginx.conf                      Request forwarding rules and maximum upload size
docker-compose.yml                    Runs every part together
```

## Main API

| Route | Who | Purpose |
|---|---|---|
| `POST /api/auth/register`, `login`, `logout` | Anyone | Sign up, sign in and out |
| `GET /api/auth/me` | Signed-in users | Current account |
| `GET /api/courses`, `GET /api/course` | Learners | Open lessons and overall progress |
| `GET /api/lessons/:id` | Learners | Lesson content for the current step (no answer keys) |
| `POST /api/lessons/:id/pretest`, `content-complete`, `watch-progress`, `posttest` | Learners | Record progress on a lesson |
| `POST /api/final-exam`, `POST /api/final-exam/:id/submit` | Learners | Course final exam |
| `GET/POST /api/admin/lessons`, `PATCH /api/admin/lessons/:id` | Teachers, administrators | Manage lessons |
| `POST /api/admin/lessons/:id/video` | Teachers, administrators | Upload an MP4 video |
| `POST /api/admin/lessons/:id/publish`, `unpublish` | Teachers (own lessons), administrators | Publish lessons |
| `GET /api/learners`, `GET /api/learners/:id/progress` | Teachers, administrators | Learner list and progress |
| `GET/PATCH /api/admin/users...` | Administrators | Manage roles |
| `GET /api/media/videos/:name` | Signed-in users | Watch an uploaded video (supports seeking) |
| `GET /api/health` | Anyone | Check that the API and database are working |

## Key rules (adjustable in the code)

- **Lesson score weights:** pre-test 20%, content 40%, post-test 40% (`server/src/services/progress-summary.ts`)
- **Video watch threshold:** set per lesson, default 80%
- **Post-test passing score:** set per lesson, default 70%
- **Final exam:** 20 random questions, passing score 70% (`server/src/services/course.service.ts`)
- **Automatic video pause:** when the tab is hidden, or after 10 minutes without activity (`client/src/app/(app)/lesson/view/page.tsx`)
- **Length limits on fields:** see `server/src/validators/`

## Known limitations

- The watch threshold and the stop position are sent by the browser, so they help check progress but do not fully prevent cheating
- Videos must be MP4 files uploaded to the system. External links (such as YouTube) cannot be tracked, so the lesson cannot be finished
- Certificates are not implemented yet (planned for the next phase)
- Videos are stored on a single server. If the number grows, move them to object storage
- Reading lessons have no reading percentage, only a "finished" status

## Troubleshooting

| Symptom | What to check |
|---|---|
| API does not start and shows `JWT_SECRET must be set` | Set `JWT_SECRET` in `server/.env` to at least 32 characters |
| Cannot connect to the database / `Authentication failed` | Check `MONGODB_URI` and `?authSource=admin` |
| Video upload returns 413 or hangs | Check `client_max_body_size` in `proxy/nginx.conf` and `proxyClientMaxBodySize` in `client/next.config.ts` |
| The page does not update after code changes | Make sure the terminal runs `next dev`, not `next start`, and restart after changing settings files |
| Lesson cannot be created (duplicate order) | Each `track + order` pair must be unique |

## Personal data

See the privacy notice at `/pdpa` in the system. Before going live, fill in the bracketed fields (organization name, data controller, retention periods) and have a specialist review it, especially the meditation experience field, which may count as sensitive data.
