# Deployment Guide - Portfolio Website ke VM Ubuntu/Debian

Step-by-step deployment guide untuk VM dengan private IP.

## Prasyarat

- VM Ubuntu/Debian sudah berjalan dan bisa diakses via SSH
- Kamu sudah bisa SSH ke VM tersebut
- VM punya akses internet (untuk install packages)

---

## Langkah 1: Transfer Project ke VM

Ada 2 cara untuk transfer project ke VM:

### Opsi A: Menggunakan SCP (dari PC Windows kamu)

```bash
# Dari PowerShell di PC kamu, compress project dulu (exclude node_modules)
# Lalu SCP ke VM:
scp -r C:\Users\dipow\Documents\antigravity\brave-lovelace user@IP_VM:/tmp/portfolio
```

### Opsi B: Menggunakan Git

```bash
# Di PC kamu, push ke git repo dulu
cd C:\Users\dipow\Documents\antigravity\brave-lovelace
git add .
git commit -m "Initial portfolio website"
git remote add origin https://github.com/username/project_portofolio.git
git push -u origin main

# Lalu di VM, clone repo
git clone https://github.com/username/project_portofolio.git /tmp/portfolio
```

---

## Langkah 2: SSH ke VM dan Setup

```bash
# SSH ke VM
ssh user@IP_VM_KAMU
```

---

## Langkah 3: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Langkah 4: Install Node.js 20.x LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node --version    # harus v20.x.x
npm --version
```

---

## Langkah 5: Install Nginx

```bash
sudo apt install -y nginx

# Verifikasi nginx berjalan
sudo systemctl status nginx
```

---

## Langkah 6: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Verifikasi
pm2 --version
```

---

## Langkah 7: Copy Project ke /var/www/portfolio

```bash
# Buat direktori
sudo mkdir -p /var/www/portfolio

# Copy dari /tmp (sesuaikan path jika berbeda)
sudo cp -r /tmp/portfolio/* /var/www/portfolio/
sudo cp -r /tmp/portfolio/.env.example /var/www/portfolio/
sudo cp -r /tmp/portfolio/.gitignore /var/www/portfolio/

# Set ownership ke user kamu
sudo chown -R $USER:$USER /var/www/portfolio
```

---

## Langkah 8: Install Dependencies

```bash
cd /var/www/portfolio
npm install --production
```

---

## Langkah 9: Setup Environment Variables

```bash
cd /var/www/portfolio

# Copy template .env
cp .env.example .env

# Edit .env dengan nano
nano .env
```

Ubah isi `.env` menjadi:

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=GANTI_DENGAN_STRING_RANDOM_YANG_PANJANG
```

Untuk generate SESSION_SECRET yang aman:

```bash
# Jalankan ini untuk generate random string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy output-nya dan paste sebagai value SESSION_SECRET di file `.env`.

Tekan `Ctrl+O` untuk save, `Ctrl+X` untuk keluar dari nano.

---

## Langkah 10: Buat Admin User

```bash
cd /var/www/portfolio
npm run seed
```

Masukkan username dan password yang kamu inginkan.
**Pastikan password minimal 6 karakter dan kuat.**

---

## Langkah 11: Start App dengan PM2

```bash
cd /var/www/portfolio/deploy
pm2 start ecosystem.config.js --env production

# Verifikasi app berjalan
pm2 status

# Lihat log jika ada error
pm2 logs portfolio
```

Pastikan status menunjukkan "online".

---

## Langkah 12: Setup PM2 Auto-Start saat Boot

```bash
# Generate startup script
pm2 startup

# PM2 akan menampilkan perintah yang harus dijalankan dengan sudo
# Contoh output:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username
# COPY dan JALANKAN perintah tersebut

# Save konfigurasi PM2
pm2 save
```

---

## Langkah 13: Konfigurasi Nginx

```bash
# Copy config nginx dari project
sudo cp /var/www/portfolio/deploy/nginx.conf /etc/nginx/sites-available/portfolio

# Buat symlink ke sites-enabled
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/

# Hapus default site nginx (opsional, tapi direkomendasikan)
sudo rm -f /etc/nginx/sites-enabled/default

# Test konfigurasi nginx
sudo nginx -t
```

Jika output menunjukkan `syntax is ok` dan `test is successful`, lanjut:

```bash
# Reload nginx
sudo systemctl reload nginx
```

---

## Langkah 14: Setup Firewall (UFW)

```bash
# Allow SSH (PENTING - jangan sampai lupa!)
sudo ufw allow ssh

# Allow HTTP (port 80)
sudo ufw allow 'Nginx HTTP'

# Enable firewall
sudo ufw enable

# Verifikasi rules
sudo ufw status
```

---

## Langkah 15: Test Akses

Dari browser di PC/laptop yang **satu jaringan** dengan VM:

```
http://IP_PRIVATE_VM_KAMU
```

Contoh: `http://192.168.1.100`

### Halaman yang tersedia:
| URL | Halaman |
|-----|---------|
| `http://IP_VM/` | Landing page portfolio |
| `http://IP_VM/login` | Halaman login |
| `http://IP_VM/admin` | Admin dashboard |

---

## Troubleshooting

### App tidak bisa diakses
```bash
# Cek apakah Node.js app berjalan
pm2 status

# Cek log error
pm2 logs portfolio --lines 50

# Cek apakah port 3000 digunakan
sudo lsof -i :3000

# Cek status nginx
sudo systemctl status nginx

# Cek error log nginx
sudo tail -20 /var/log/nginx/error.log
```

### Permission denied saat menjalankan npm
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/portfolio
```

### Restart semua service
```bash
# Restart app
pm2 restart portfolio

# Restart nginx
sudo systemctl restart nginx
```

### Update website setelah perubahan
```bash
cd /var/www/portfolio

# Jika pakai Git:
git pull origin main
npm install --production
pm2 restart portfolio

# Jika manual, upload file baru lalu:
pm2 restart portfolio
```

---

## Ringkasan Arsitektur

```
Browser (PC di jaringan yang sama)
    |
    | HTTP (port 80)
    v
  Nginx (reverse proxy, gzip, static cache)
    |
    | proxy_pass (port 3000)
    v
  Node.js + Express (PM2 managed)
    |
    v
  SQLite Database (data/portfolio.db)
```

---

## Catatan Keamanan

- Ganti SESSION_SECRET dengan string random yang panjang
- Gunakan password admin yang kuat (minimal 8 karakter, kombinasi huruf+angka+simbol)
- Karena VM belum punya IP publik, website hanya bisa diakses dari jaringan lokal kantor
- Jika nanti dapat IP publik, pertimbangkan untuk setup SSL/HTTPS menggunakan Let's Encrypt
