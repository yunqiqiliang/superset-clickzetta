#!/bin/bash

# 为 Superset Dashboard 启用 Embedded 模式
# 用法: ./enable-dashboard-embedded.sh <DASHBOARD_UUID>

SUPERSET_URL="http://localhost:8088"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin"

if [ -z "$1" ]; then
  echo "❌ 错误：请提供 Dashboard UUID"
  echo ""
  echo "用法: $0 <DASHBOARD_UUID>"
  echo ""
  echo "示例: $0 6d106529-9f27-4df9-9c9e-50e036a67559"
  echo ""
  echo "获取可用的 Dashboards:"
  echo "  curl http://localhost:3001/api/dashboards"
  exit 1
fi

DASHBOARD_UUID="$1"

echo "🔐 登录到 Superset..."
LOGIN_RESPONSE=$(curl -s -X POST "${SUPERSET_URL}/api/v1/security/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\",\"provider\":\"db\"}")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ 登录失败"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登录成功"
echo ""
echo "📊 为 Dashboard 启用 embedded 模式..."
echo "   Dashboard UUID: $DASHBOARD_UUID"
echo ""

# 为 Dashboard 创建 embedded 配置
EMBEDDED_RESPONSE=$(curl -s -X POST "${SUPERSET_URL}/api/v1/dashboard/${DASHBOARD_UUID}/embedded" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "allowed_domains": [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      "http://127.0.0.1:5173"
    ]
  }')

# 检查是否成功
if echo "$EMBEDDED_RESPONSE" | grep -q '"uuid"'; then
  EMBEDDED_UUID=$(echo $EMBEDDED_RESPONSE | python3 -c 'import sys, json; print(json.load(sys.stdin).get("result", {}).get("uuid", "N/A"))')

  echo "✅ Dashboard embedded 模式已启用！"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 重要信息："
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Dashboard UUID:  $DASHBOARD_UUID"
  echo "Embedded UUID:   $EMBEDDED_UUID"
  echo ""
  echo "使用方法："
  echo ""
  echo "1. 后端 API (生成 guest token) - 使用 Dashboard UUID:"
  echo "   dashboardId: '$DASHBOARD_UUID'"
  echo ""
  echo "2. 前端 SDK (embedDashboard) - 使用 Embedded UUID:"
  echo "   id: '$EMBEDDED_UUID'"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "完整响应:"
  echo "$EMBEDDED_RESPONSE" | python3 -m json.tool
else
  echo "❌ 启用失败"
  echo ""
  echo "响应:"
  echo "$EMBEDDED_RESPONSE" | python3 -m json.tool
  echo ""
  echo "可能的原因："
  echo "  1. Dashboard UUID 不正确"
  echo "  2. Dashboard 已经启用了 embedded 模式"
  echo "  3. 权限不足"
  exit 1
fi
