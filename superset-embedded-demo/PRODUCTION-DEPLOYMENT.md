# Superset Embedded Dashboard - 生产环境部署指南

## 📋 部署检查清单

### 1. 前置要求

- [ ] **HTTPS 证书**：购买或使用 Let's Encrypt
- [ ] **域名**：配置 DNS 指向你的服务器
- [ ] **PostgreSQL**：生产数据库（不要使用 SQLite）
- [ ] **Redis**：用于缓存和会话管理
- [ ] **反向代理**：Nginx 或 Apache
- [ ] **防火墙**：配置安全规则

### 2. 服务器配置

#### 最低硬件要求

| 组件 | 开发环境 | 生产环境（小型） | 生产环境（大型） |
|------|----------|------------------|------------------|
| CPU | 2 cores | 4 cores | 8+ cores |
| RAM | 4 GB | 8 GB | 16+ GB |
| 存储 | 20 GB | 100 GB | 500+ GB |
| 带宽 | 10 Mbps | 100 Mbps | 1 Gbps |

## 🚀 部署步骤

### 步骤 1: 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js (18.x)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 安装 Nginx
sudo apt install -y nginx
sudo systemctl enable nginx

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

### 步骤 2: 配置 PostgreSQL

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE superset;
CREATE USER superset_user WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE superset TO superset_user;
\q
```

### 步骤 3: 部署 Superset

```bash
# 克隆项目
cd /opt
sudo git clone https://github.com/apache/superset.git
cd superset

# 复制生产配置
sudo cp ~/superset-embed-demo/config/superset_config_production.py docker/pythonpath_dev/

# 设置环境变量
sudo tee /opt/superset/.env << EOF
SUPERSET_SECRET_KEY=$(openssl rand -base64 42)
DATABASE_URL=postgresql://superset_user:your-strong-password@localhost/superset
REDIS_URL=redis://localhost:6379/0
EOF

# 使用 Docker Compose 启动
sudo docker-compose -f docker-compose-prod.yml up -d
```

### 步骤 4: 部署后端 API

```bash
# 创建应用目录
sudo mkdir -p /opt/superset-embed-api
cd /opt/superset-embed-api

# 复制文件
sudo cp ~/superset-embed-demo/backend/server-production.js .
sudo cp ~/superset-embed-demo/backend/package-production.json package.json

# 安装依赖
sudo npm install --production

# 创建环境变量
sudo tee /opt/superset-embed-api/.env.production << EOF
SUPERSET_URL=https://your-superset-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -base64 32)
REDIS_URL=redis://localhost:6379/1
ALLOWED_ORIGINS=https://your-app-domain.com
PORT=3001
NODE_ENV=production
EOF

# 创建 systemd 服务
sudo tee /etc/systemd/system/superset-embed-api.service << EOF
[Unit]
Description=Superset Embed Backend API
After=network.target redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/superset-embed-api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server-production.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable superset-embed-api
sudo systemctl start superset-embed-api
```

### 步骤 5: 配置 Nginx

```bash
# 创建 Superset 配置
sudo tee /etc/nginx/sites-available/superset << 'EOF'
# Superset 主站
server {
    listen 80;
    server_name your-superset-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-superset-domain.com;

    # SSL 证书（使用 Let's Encrypt 或购买的证书）
    ssl_certificate /etc/letsencrypt/live/your-superset-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-superset-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 反向代理到 Superset
    location / {
        proxy_pass http://localhost:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 日志
    access_log /var/log/nginx/superset_access.log;
    error_log /var/log/nginx/superset_error.log;
}
EOF

# 创建后端 API 配置
sudo tee /etc/nginx/sites-available/superset-api << 'EOF'
# 后端 API
server {
    listen 80;
    server_name api.your-superset-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-superset-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/api.your-superset-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-superset-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 安全头
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS（Nginx 层面）
    add_header Access-Control-Allow-Origin "https://your-app-domain.com" always;
    add_header Access-Control-Allow-Methods "POST, GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type" always;
    add_header Access-Control-Max-Age "3600" always;

    # 反向代理到后端 API
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 限流
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # 日志
    access_log /var/log/nginx/api_access.log;
    error_log /var/log/nginx/api_error.log;
}
EOF

# 启用站点
sudo ln -s /etc/nginx/sites-available/superset /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/superset-api /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 步骤 6: 获取 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-superset-domain.com -d api.your-superset-domain.com

# 自动续期
sudo systemctl enable certbot.timer
```

### 步骤 7: 配置防火墙

```bash
# 使用 UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

## 🔒 安全加固

### 1. 强化 PostgreSQL

```bash
# 编辑 pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# 只允许本地连接
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            md5
```

### 2. 强化 Redis

```bash
# 编辑 redis.conf
sudo nano /etc/redis/redis.conf

# 设置密码
requirepass your-strong-redis-password

# 只监听本地
bind 127.0.0.1 ::1

# 重启 Redis
sudo systemctl restart redis-server
```

### 3. 定期备份

```bash
# 创建备份脚本
sudo tee /opt/backup-superset.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/superset"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -U superset_user superset | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 备份 Redis（可选）
redis-cli --rdb $BACKUP_DIR/redis_$DATE.rdb

# 删除 7 天前的备份
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /opt/backup-superset.sh

# 添加到 cron（每天 2:00 AM）
echo "0 2 * * * /opt/backup-superset.sh" | sudo crontab -
```

### 4. 监控和日志

```bash
# 安装监控工具
sudo apt install -y prometheus-node-exporter

# 配置日志轮转
sudo tee /etc/logrotate.d/superset << EOF
/var/log/nginx/superset*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 \`cat /var/run/nginx.pid\`
    endscript
}
EOF
```

## 📊 性能优化

### 1. Redis 优化

```bash
# 编辑 /etc/redis/redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 2. PostgreSQL 优化

```sql
-- 调整连接池
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '64MB';

-- 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 3. Nginx 缓存

```nginx
# 在 /etc/nginx/nginx.conf 的 http 块中添加
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=superset_cache:10m max_size=1g inactive=60m;
```

## 🔍 故障排查

### 检查服务状态

```bash
# Superset
sudo docker ps | grep superset

# 后端 API
sudo systemctl status superset-embed-api

# Nginx
sudo systemctl status nginx

# Redis
sudo systemctl status redis-server

# PostgreSQL
sudo systemctl status postgresql
```

### 查看日志

```bash
# Superset 日志
sudo docker logs superset_app

# API 日志
sudo journalctl -u superset-embed-api -f

# Nginx 日志
sudo tail -f /var/log/nginx/superset_error.log
sudo tail -f /var/log/nginx/api_error.log
```

## 📞 维护和更新

### 更新 Superset

```bash
cd /opt/superset
sudo git pull
sudo docker-compose -f docker-compose-prod.yml down
sudo docker-compose -f docker-compose-prod.yml up -d --build
```

### 更新后端 API

```bash
cd /opt/superset-embed-api
sudo git pull
sudo npm install --production
sudo systemctl restart superset-embed-api
```

## ✅ 最终检查

- [ ] HTTPS 正常工作
- [ ] 所有服务自动启动
- [ ] 防火墙规则配置正确
- [ ] 备份脚本运行正常
- [ ] 日志轮转配置
- [ ] 监控系统运行
- [ ] Dashboard 可以正常嵌入
- [ ] 编辑按钮被隐藏或禁用
- [ ] Guest token 过期时间合理
- [ ] 速率限制正常工作

## 🎯 生产环境 vs 开发环境对比

| 功能 | 开发环境 | 生产环境 |
|------|----------|----------|
| HTTPS | ❌ | ✅ 必需 |
| CSRF | ❌ 禁用 | ✅ 启用 |
| Talisman | ❌ 禁用 | ✅ 启用 |
| 速率限制 | ❌ | ✅ 50/小时 |
| Redis 缓存 | ❌ | ✅ 启用 |
| 错误处理 | ❌ 简单 | ✅ 完善 |
| 日志 | ❌ Console | ✅ 文件/监控 |
| 备份 | ❌ | ✅ 每日 |
| 监控 | ❌ | ✅ Prometheus |

恭喜！你的 Superset Embedded Dashboard 已经可以安全地部署到生产环境了 🎉
