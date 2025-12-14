const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Superset 配置
const SUPERSET_URL = process.env.SUPERSET_URL || 'http://localhost:8088';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// CORS 配置 - 开发环境完全开放
app.use(cors({
  origin: true,  // 允许所有来源（开发环境）
  credentials: true
}));

app.use(express.json());

// 缓存 access token（生产环境应该用 Redis）
let cachedAccessToken = null;
let tokenExpiry = null;

/**
 * 获取 Superset Access Token
 */
async function getAccessToken() {
  // 如果 token 还有效，直接返回
  if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  try {
    const response = await axios.post(`${SUPERSET_URL}/api/v1/security/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      provider: 'db'
    });

    cachedAccessToken = response.data.access_token;
    // Token 有效期通常是 15 分钟，提前 1 分钟刷新
    tokenExpiry = Date.now() + (14 * 60 * 1000);

    console.log('✅ Successfully obtained access token');
    return cachedAccessToken;
  } catch (error) {
    console.error('❌ Failed to get access token:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * API: 获取 Guest Token
 *
 * 请求参数：
 * - dashboardId: Dashboard UUID（必需）
 * - userId: 当前用户 ID（可选，用于 RLS）
 * - username: 当前用户名（可选）
 */
app.post('/api/guest-token', async (req, res) => {
  try {
    const { dashboardId, userId, username } = req.body;

    if (!dashboardId) {
      return res.status(400).json({
        error: 'dashboardId is required'
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

    // 如果提供了 userId，添加 RLS 规则
    if (userId) {
      guestTokenPayload.rls.push({
        clause: `user_id = ${userId}`
      });
    }

    // 3. 请求 guest token（不需要 CSRF token，JWT 中已包含）
    const response = await axios.post(
      `${SUPERSET_URL}/api/v1/security/guest_token/`,
      guestTokenPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Generated guest token for dashboard: ${dashboardId}`);

    res.json({
      token: response.data.token
    });

  } catch (error) {
    console.error('❌ Error generating guest token:', error.response?.data || error.message);

    res.status(500).json({
      error: 'Failed to generate guest token',
      message: error.response?.data?.message || error.message
    });
  }
});

/**
 * API: 获取可用的 Dashboards 列表
 */
app.get('/api/dashboards', async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `${SUPERSET_URL}/api/v1/dashboard/`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const dashboards = response.data.result.map(d => ({
      id: d.id,
      uuid: d.uuid,
      title: d.dashboard_title,
      url: d.url
    }));

    res.json({ dashboards });

  } catch (error) {
    console.error('❌ Error fetching dashboards:', error.response?.data || error.message);

    res.status(500).json({
      error: 'Failed to fetch dashboards',
      message: error.response?.data?.message || error.message
    });
  }
});

/**
 * API: 启用 Dashboard 的 Embedded 模式
 */
app.post('/api/enable-embedded', async (req, res) => {
  try {
    const { dashboardUuid } = req.body;

    if (!dashboardUuid) {
      return res.status(400).json({
        error: 'dashboardUuid is required'
      });
    }

    console.log(`📊 Enabling embedded mode for dashboard: ${dashboardUuid}`);

    // 1. 获取 access token
    const accessToken = await getAccessToken();

    // 2. 启用 embedded 模式
    const response = await axios.post(
      `${SUPERSET_URL}/api/v1/dashboard/${dashboardUuid}/embedded`,
      {
        allowed_domains: [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:3002',
          'http://127.0.0.1:5173',
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const embeddedUuid = response.data.result.uuid;
    console.log(`✅ Embedded mode enabled! Embedded UUID: ${embeddedUuid}`);

    res.json({
      dashboardUuid: dashboardUuid,
      embeddedUuid: embeddedUuid,
      allowedDomains: response.data.result.allowed_domains
    });

  } catch (error) {
    console.error('❌ Error enabling embedded mode:', error.response?.data || error.message);

    res.status(500).json({
      error: 'Failed to enable embedded mode',
      message: error.response?.data?.message || error.message
    });
  }
});

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    superset_url: SUPERSET_URL,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`
🚀 Superset Embed Backend API is running!

   Server:        http://localhost:${PORT}
   Superset URL:  ${SUPERSET_URL}

   Available endpoints:
   - POST /api/guest-token      获取 guest token
   - GET  /api/dashboards       获取 dashboards 列表
   - GET  /health               健康检查

📝 Make sure your Superset is running and accessible!
  `);
});
