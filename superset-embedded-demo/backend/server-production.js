// Superset Embedded Backend API - 生产环境版本

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ========== 环境变量验证 ==========
const requiredEnvVars = ['SUPERSET_URL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'REDIS_URL', 'ALLOWED_ORIGINS'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ 缺少必需的环境变量: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Superset 配置
const SUPERSET_URL = process.env.SUPERSET_URL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Redis 客户端（用于缓存）
const redis = new Redis(process.env.REDIS_URL);

// ========== 安全中间件 ==========
// Helmet - 设置安全响应头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS 配置（严格）
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
app.use(cors({
  origin: function (origin, callback) {
    // 允许没有 origin 的请求（如服务器到服务器）
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ========== 速率限制 ==========
// 通用限制
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 次请求
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Guest token 限制（更严格）
const guestTokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 50, // 最多 50 次请求
  message: { error: 'Too many guest token requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // 基于 IP 和 dashboardId 限制
  keyGenerator: (req) => {
    const ip = req.ip;
    const dashboardId = req.body?.dashboardId || 'unknown';
    return `${ip}:${dashboardId}`;
  }
});

app.use(generalLimiter);

// ========== Token 缓存（Redis）==========
const TOKEN_CACHE_KEY = 'superset:access_token';
const TOKEN_EXPIRY_BUFFER = 60; // 提前 1 分钟刷新

/**
 * 获取 Superset Access Token（带 Redis 缓存）
 */
async function getAccessToken() {
  try {
    // 1. 尝试从 Redis 获取
    const cachedToken = await redis.get(TOKEN_CACHE_KEY);
    if (cachedToken) {
      console.log('✅ Using cached access token');
      return cachedToken;
    }

    // 2. 获取新 token
    console.log('🔐 Fetching new access token from Superset...');
    const response = await axios.post(`${SUPERSET_URL}/api/v1/security/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      provider: 'db'
    });

    const accessToken = response.data.access_token;

    // 3. 缓存到 Redis（14 分钟过期）
    const expirySeconds = 14 * 60 - TOKEN_EXPIRY_BUFFER;
    await redis.setex(TOKEN_CACHE_KEY, expirySeconds, accessToken);

    console.log('✅ Access token cached successfully');
    return accessToken;
  } catch (error) {
    console.error('❌ Failed to get access token:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 验证 Dashboard UUID 格式
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * API: 获取 Guest Token（带速率限制和验证）
 */
app.post('/api/guest-token', guestTokenLimiter, async (req, res) => {
  try {
    const { dashboardId, userId, username } = req.body;

    // 验证参数
    if (!dashboardId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dashboardId is required'
      });
    }

    if (!isValidUUID(dashboardId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid dashboardId format'
      });
    }

    // 可选：验证 username（防止注入）
    if (username && !/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid username format'
      });
    }

    // 1. 获取 access token
    const accessToken = await getAccessToken();

    // 2. 准备 guest token 请求
    const guestTokenPayload = {
      user: {
        username: username || 'guest_user',
        first_name: 'Guest',
        last_name: 'User'
      },
      resources: [{
        type: 'dashboard',
        id: dashboardId
      }],
      rls: []  // 行级安全规则
    };

    // 如果提供了 userId，添加 RLS 规则（需要验证）
    if (userId) {
      // 验证 userId 是整数
      const userIdInt = parseInt(userId);
      if (!isNaN(userIdInt) && userIdInt > 0) {
        guestTokenPayload.rls.push({
          clause: `user_id = ${userIdInt}`
        });
      } else {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid userId format'
        });
      }
    }

    // 3. 请求 guest token
    const response = await axios.post(
      `${SUPERSET_URL}/api/v1/security/guest_token/`,
      guestTokenPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000  // 10 秒超时
      }
    );

    console.log(`✅ Generated guest token for dashboard: ${dashboardId}`);

    res.json({
      token: response.data.token,
      expiresIn: 300  // 5 分钟
    });

  } catch (error) {
    console.error('❌ Error generating guest token:', {
      dashboardId: req.body?.dashboardId,
      error: error.response?.data || error.message
    });

    // 不要向客户端泄露详细错误信息
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      error: 'Failed to generate guest token',
      message: 'Please contact support if this problem persists.'
    });
  }
});

/**
 * API: 获取可用的 Dashboards 列表（带缓存）
 */
app.get('/api/dashboards', async (req, res) => {
  const CACHE_KEY = 'superset:dashboards';
  const CACHE_TTL = 300; // 5 分钟

  try {
    // 1. 尝试从缓存获取
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      console.log('✅ Returning cached dashboards');
      return res.json(JSON.parse(cached));
    }

    // 2. 从 Superset 获取
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `${SUPERSET_URL}/api/v1/dashboard/`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const dashboards = response.data.result.map(d => ({
      id: d.id,
      uuid: d.uuid,
      title: d.dashboard_title,
      url: d.url,
      published: d.published || false
    })).filter(d => d.published); // 只返回已发布的

    const result = { dashboards };

    // 3. 缓存结果
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(result));

    res.json(result);

  } catch (error) {
    console.error('❌ Error fetching dashboards:', error.response?.data || error.message);

    res.status(500).json({
      error: 'Failed to fetch dashboards',
      message: 'Please contact support if this problem persists.'
    });
  }
});

/**
 * 健康检查
 */
app.get('/health', async (req, res) => {
  try {
    // 检查 Redis 连接
    await redis.ping();

    // 检查 Superset 连接
    await axios.get(`${SUPERSET_URL}/health`, { timeout: 5000 });

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'ok',
        superset: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * 404 处理
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

/**
 * 错误处理中间件
 */
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

/**
 * 优雅关闭
 */
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
🚀 Superset Embed Backend API (Production) is running!

   Server:        http://localhost:${PORT}
   Superset URL:  ${SUPERSET_URL}
   Environment:   ${process.env.NODE_ENV || 'production'}

   Available endpoints:
   - POST /api/guest-token      生成 guest token（限流：50/小时）
   - GET  /api/dashboards       获取 dashboards 列表（缓存 5 分钟）
   - GET  /health               健康检查

📝 Security features enabled:
   ✅ CORS: Strict origin checking
   ✅ Rate limiting: Enabled
   ✅ Helmet: Security headers
   ✅ Redis: Token caching
   ✅ Input validation: Enabled

⚠️  Make sure all environment variables are set correctly!
  `);
});
