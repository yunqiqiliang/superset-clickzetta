# Superset Embedded Dashboard - 生产环境部署指南

## 🚨 当前开发环境 vs 生产环境对比

### 开发环境配置（当前状态 - ⚠️ 不安全）

| 配置项 | 开发环境 | 安全风险 |
|--------|----------|----------|
| `WTF_CSRF_ENABLED` | `False` | ❌ 容易受到 CSRF 攻击 |
| `TALISMAN_ENABLED` | `False` | ❌ 缺少安全响应头 |
| `SESSION_COOKIE_SECURE` | `False` | ❌ Cookie 可被中间人攻击 |
| `PUBLIC_ROLE_LIKE` | `"Admin"` | ❌ Guest 用户权限过高 |
| CORS | `origin: true` | ❌ 允许任何域名访问 |
| HTTPS | 未使用 | ❌ 数据明文传输 |

## ✅ 生产环境完整配置

### 1. Superset 配置（生产环境）

创建新的配置文件 `superset_config_production.py`：

<function_calls>
<invoke name="Write">
<parameter name="content"># Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

# Superset 生产环境配置 - Embedded Dashboard

import os
from typing import Optional

# ========== 基础配置 ==========
SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY")  # 必须设置强密钥
if not SECRET_KEY:
    raise ValueError("SUPERSET_SECRET_KEY 环境变量必须设置")

# ========== 数据库配置 ==========
SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URI:
    raise ValueError("DATABASE_URL 环境变量必须设置")

# ========== 功能开关 ==========
FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "EMBEDDED_SUPERSET": True,  # 启用嵌入式功能
}

# ========== 嵌入式配置（生产环境）==========
# 只允许特定的可信域名
EMBEDDED_DOMAINS = [
    "https://your-app.com",  # 替换为你的实际域名
    "https://www.your-app.com",
    # 不要添加 localhost 或通配符
]

# ========== CORS 配置（严格）==========
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["Content-Type", "Authorization", "X-CSRFToken"],
    "resources": ["/api/*", "/superset/*"],
    "origins": EMBEDDED_DOMAINS,
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}

# ========== CSRF 保护（必须启用）==========
WTF_CSRF_ENABLED = True
WTF_CSRF_TIME_LIMIT = None  # CSRF token 不过期

# CSRF 豁免的端点（仅 guest token API）
WTF_CSRF_EXEMPT_LIST = ["superset.views.core.log"]

# ========== Talisman 安全配置（必须启用）==========
TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    "content_security_policy": {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "frame-ancestors": EMBEDDED_DOMAINS,  # 只允许这些域名嵌入
    },
    "content_security_policy_nonce_in": ["script-src"],
    "force_https": True,  # 强制 HTTPS
    "strict_transport_security": True,
    "strict_transport_security_max_age": 31536000,  # 1 年
    "strict_transport_security_include_subdomains": True,
}

# ========== Guest Token 配置 ==========
# 使用 Gamma 角色（只读权限）
PUBLIC_ROLE_LIKE = "Gamma"

# Guest token 有效期（秒）
GUEST_TOKEN_JWT_EXP_SECONDS = 300  # 5 分钟

# ========== Session 配置（HTTPS 必需）==========
SESSION_COOKIE_SECURE = True  # 只通过 HTTPS 传输
SESSION_COOKIE_HTTPONLY = True  # 防止 JavaScript 访问
SESSION_COOKIE_SAMESITE = "None"  # 允许跨站请求（嵌入必需）

# Session 过期时间
PERMANENT_SESSION_LIFETIME = 3600  # 1 小时

# ========== 速率限制 ==========
RATELIMIT_ENABLED = True
RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/1")

# Guest token 端点限制
RATELIMIT_GUEST_TOKEN = "100 per hour"  # 每小时 100 次

# ========== 日志配置 ==========
ENABLE_PROXY_FIX = True  # 信任反向代理的 headers

# 日志级别
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s:%(levelname)s:%(name)s:%(message)s"

# ========== 缓存配置 ==========
CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_URL": os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
}

DATA_CACHE_CONFIG = CACHE_CONFIG

# ========== 权限配置 ==========
# 创建专门的 Embedded Guest 角色
GUEST_ROLE_NAME = "EmbeddedGuest"

# 该角色的权限（只读）
# 在 Superset UI 中手动配置此角色的权限

# ========== 监控和告警 ==========
STATS_LOGGER = None  # 可以集成 StatsD 或其他监控工具

# ========== 安全最佳实践 ==========
# 禁用不需要的功能
SQLLAB_CTAS_NO_LIMIT = False
PREVENT_UNSAFE_DB_CONNECTIONS = True

# SQL 注入防护
SQL_MAX_ROW = 100000  # 限制查询结果行数

# ========== 环境变量验证 ==========
required_env_vars = [
    "SUPERSET_SECRET_KEY",
    "DATABASE_URL",
    "REDIS_URL",
]

missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
if missing_vars:
    raise ValueError(f"缺少必需的环境变量: {', '.join(missing_vars)}")

# ========== 部署说明 ==========
"""
生产环境部署检查清单：

1. ✅ SECRET_KEY: 使用强随机密钥（至少 32 字符）
2. ✅ DATABASE_URL: 配置生产数据库（PostgreSQL）
3. ✅ REDIS_URL: 配置 Redis 用于缓存和限流
4. ✅ HTTPS: 必须使用 HTTPS（Nginx/Apache 配置 SSL）
5. ✅ EMBEDDED_DOMAINS: 只添加可信域名
6. ✅ 防火墙: 限制 Superset 端口访问
7. ✅ 日志: 配置日志收集和监控
8. ✅ 备份: 配置数据库定期备份
9. ✅ 更新: 定期更新 Superset 版本
10. ✅ 审计: 启用审计日志
"""
