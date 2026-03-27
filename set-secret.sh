#!/bin/bash
# 设置 GitHub Secret 脚本

REPO="tanglaoban0-hash/phemex"
TOKEN="rlwy_oacs_d32814b23a6d097ff643eb23fa732e1fe97354"

echo "设置 RAILWAY_TOKEN 到 GitHub 仓库..."

# 使用 GitHub CLI 设置 secret（如果已安装 gh）
if command -v gh &> /dev/null; then
    echo "$TOKEN" | gh secret set RAILWAY_TOKEN --repo "$REPO"
    echo "✅ Secret 设置成功"
else
    echo "请手动设置："
    echo "1. 访问 https://github.com/$REPO/settings/secrets/actions"
    echo "2. 点击 'New repository secret'"
    echo "3. Name: RAILWAY_TOKEN"
    echo "4. Value: $TOKEN"
fi
