# ⚡ ZenSend (Zend by Zentyr)

**ZenSend** คือเว็บแอปพลิเคชันสำหรับส่งไฟล์ รูปภาพ และวิดีโอข้ามอุปกรณ์แบบ **Direct P2P (Peer-to-Peer)** ที่เน้นความง่าย รวดเร็ว และเป็นส่วนตัวสูงสุด 

> 💡 **ปรัชญา Zero-Storage**: เซิร์ฟเวอร์ทำหน้าที่เป็นเพียงตัวกลางจับคู่ (Signaling) และท่อส่งต่อข้อมูลในหน่วยความจำ (Relay via RAM) เมื่อติด Firewall เท่านั้น **ไม่มีการบันทึกไฟล์ลงดิสก์เซิร์ฟเวอร์แม้แต่ไบต์เดียว** ข้อมูลถูกส่งตรงระหว่างเครื่องผู้ส่งและผู้รับ (P2P Direct Stream) ปลอดภัย รวดเร็วตามสปีดเครือข่าย ไม่ต้องแอดเพื่อนบน LINE หรือ Facebook เพื่อส่งงาน

---

## ✨ คุณสมบัติเด่น (Features)

- **🚀 Hybrid Transfer Protocol**:
  - **P2P Direct**: ส่งตรงระหว่างเครื่องผ่าน LAN / Wi-Fi ความเร็วเต็มสปีดเราเตอร์ (50–100+ MB/s) ไม่ใช้อินเทอร์เน็ตออกนอก
  - **Oracle Coturn (TURN/STUN)**: ระบบสำรองระดับ Production เมื่อเครื่องอยู่ต่างเครือข่าย หรือติดไฟร์วอลล์/เน็ตมือถือ 4G/5G สามารถส่งข้อมูลทะลุหากันได้ 99.9%
- **🔒 Zero-Storage & Local Encryption**:
  - ไม่เก็บไฟล์ ไม่ต้องล็อกอิน ไม่ขอสิทธิ์ส่วนตัว
  - รองรับ End-to-End Encryption (E2EE) ด้วย Web Crypto API (AES-GCM 256-bit)
- **🎯 Modern Minimalist UI (Zen & AirDrop Vibe)**:
  - ดีไซน์ใหม่ **Obsidian Slate Dark Mode** และ **Crisp Clean Light Mode** สไตล์ Apple AirDrop + Linear
  - **Zen Radar Pulse**: วงคลื่นเรดาร์ค้นหาอุปกรณ์รอบข้างแบบเรียลไทม์
  - **Hardware OS Badges**: แสดงไอคอนอุปกรณ์จริง (Apple iPhone/Mac, Windows, Android, Linux)
  - **AirDrop-style File Notification**: มี Thumbnail พรีวิวไฟล์ และปุ่มกดรับ/ปฏิเสธชัดเจน
- **📦 Multi-File, Large Files & Folders**:
  - ลากโฟลเดอร์หรือเลือกส่งทีเดียวหลายไฟล์ ระบบมี Smart Zip บนเครื่องฝั่งส่งอัตโนมัติ
  - รองรับไฟล์ขนาดใหญ่ (ระดับกิกะไบต์ / วิดีโอ 4K) ด้วย Streams API และ Backpressure control ไม่ทำให้ Browser แรมล้น (OOM Crash)
- **📱 ติดตั้งแบบ PWA (Progressive Web App)**:
  - ติดตั้งเป็นแอปบนหน้าจอหลักได้ทั้ง iOS, Android, macOS และ Windows
- **💬 Direct Text & Clipboard Sharing**:
  - ส่งข้อความ ตัวอักษร ลิงก์ข้ามเครื่องได้ทันที พร้อมปุ่มคัดลอกลง Clipboard

---

## 🏗️ สถาปัตยกรรมระดับ Production (Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser / Mobile                    │
│             (Vercel Edge Global CDN: Next.js PWA)           │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
    1. Signaling (จับคู่/แลกคีย์)               │ 2. WebRTC P2P Direct
     Socket.IO (WebSocket)                     │    (LAN / WiFi / Direct WAN)
               │                               │    ความเร็วเต็มสปีดเราเตอร์ ไม่กินเน็ตนอก
┌──────────────▼───────────────────────────────┼──────────────┐
│  Oracle Cloud Ubuntu (Always Free Tier VM)   │              │
│  - Public Static IP / Port 443 / Port 3478   │              │
│  ┌────────────────────────┐                  │              │
│  │ Signaling Server (Node)│                  │              │
│  │ (RAM ~30MB, แค่จับคู่)  │                  │              │
│  └────────────────────────┘                  │              │
│  ┌────────────────────────┐  3. TURN Relay   ▼              │
│  │ Coturn (TURN/STUN)     │◄════════════════════════════════╝
│  │ (เฉพาะกรณีติดเน็ต 4G/Symmetric NAT ที่ P2P ตรงไม่ได้)      │
│  └────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Communication**: WebRTC DataChannels (P2P), Socket.io Client
- **Signaling Backend**: Node.js / Bun, Socket.io Server
- **NAT Traversal**: Coturn (STUN/TURN) บน Oracle Cloud Ubuntu
- **Optimization**: Web Workers, Adaptive Chunking (16KB–64KB), StreamSaver API, WakeLock API

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

### การรันในเครื่อง (Local Development)

1. **ติดตั้ง Dependencies**:
   ```bash
   bun install
   # หรือ npm install
   ```

2. **คัดลอกไฟล์ Environment**:
   ```bash
   cp .env.example .env
   ```

3. **เริ่มเซิร์ฟเวอร์ Development**:
   ```bash
   bun run dev
   ```
   เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

4. **ทดสอบบิลด์ Production**:
   ```bash
   bun run build
   bun start
   ```

---

## 🌐 การนำขึ้นใช้งานจริง (Production Deployment)

### 1. นำ Frontend ขึ้น Vercel
1. นำโค้ดขึ้น GitHub Repository
2. เข้าไปที่ [Vercel](https://vercel.com) แล้ว Import โปรเจกต์
3. กำหนด Environment Variables:
   - `NEXT_PUBLIC_SIGNALING_URL`: `https://api.your-oracle-domain.com` (หรือ IP ของ Oracle Cloud)
   - `NEXT_PUBLIC_SITE_URL`: `https://zensend.zentyr.com`
   - `TURN_SERVER_URL`: `turn:YOUR_ORACLE_IP:3478`
   - `TURN_USERNAME`: `zensend`
   - `TURN_CREDENTIAL`: `your_turn_password`
4. กด **Deploy**

### 2. ติดตั้ง Backend & Coturn บน Oracle Cloud Ubuntu Free Tier
1. SSH เข้าไปยังเครื่อง Ubuntu ของคุณ
2. อัปโหลดโฟลเดอร์ `deploy/` หรือ clone repository
3. **ติดตั้ง Coturn (TURN/STUN Server) ด้วยสคริปต์อัตโนมัติ**:
   ```bash
   chmod +x deploy/coturn-setup.sh
   sudo ./deploy/coturn-setup.sh
   ```
4. **เปิดพอร์ตใน Oracle Cloud Console (Virtual Cloud Network -> Security Lists -> Ingress Rules)**:
   - Port `3478, 5349` (TCP/UDP) สำหรับ STUN/TURN
   - Port `49152-65535` (UDP) สำหรับ TURN Relay Media Ports
   - Port `3001` (TCP) สำหรับ Signaling Server
5. **รัน Signaling Server ด้วย PM2**:
   ```bash
   npm install -g pm2
   bun install
   pm2 start deploy/ecosystem.config.js
   pm2 save
   pm2 startup
   ```

---

## 📁 โครงสร้างโปรเจกต์ (Standardized Directory Structure)

```
ZenSend/
├── deploy/                      # ไฟล์และสคริปต์สำหรับ Production
│   ├── coturn-setup.sh          # สคริปต์ติดตั้ง Coturn STUN/TURN อัตโนมัติ
│   ├── ecosystem.config.js      # คอนฟิก PM2 สำหรับรัน Signaling Server
│   └── signaling.service        # คอนฟิก Systemd Service สำหรับ Ubuntu
├── public/                      # Static Assets, Icons, Manifest
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # Backend API routes (ice-servers, feedback)
│   │   ├── globals.css          # Zen Modern Obsidian/Slate Design System
│   │   ├── layout.tsx           # SEO Metadata, PWA, Font configuration
│   │   └── page.tsx             # Main Application View
│   ├── components/              # UI Components
│   │   ├── ZenRadar.tsx         # Ambient Radar Pulse Background
│   │   ├── Header.tsx           # ZenSend Logo & Actions
│   │   ├── PeerCard.tsx         # Modern OS Device Node Card
│   │   ├── PeersGrid.tsx        # Grid of Active Devices
│   │   ├── EmptyState.tsx       # Zen Scanning Radar & Instant Actions
│   │   ├── MyInfo.tsx           # Personal Device Node Badge
│   │   ├── ModeSelector.tsx     # Wi-Fi / Public / Room Code Switcher
│   │   ├── TransferProgress.tsx # Real-time HUD (Speed, ETA, Progress)
│   │   └── modals/              # Dialogs (AirDrop-style FileOffer, QR, etc.)
│   ├── hooks/                   # React Hooks (usePeerConnection, useSound, etc.)
│   └── lib/                     # Core Business Logic
│       ├── devices.ts           # Device Standards, OS Detection, Zen Names
│       ├── adaptiveChunker.ts   # Network-aware Dynamic Chunk Sizing
│       ├── streamSaver.ts       # Low-memory Stream Disk Writer
│       ├── compression.ts       # Zip On-The-Fly Packaging
│       └── webrtc/              # WebRTC DataChannel & ICE Management
├── server.ts                    # Standalone Node/Bun Socket.IO Signaling Server
└── package.json                 # Dependencies & Build scripts
```

---

## 📄 ใบอนุญาต (License)

MIT License • Developed & Designed by **Zentyr**