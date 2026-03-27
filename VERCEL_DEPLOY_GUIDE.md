# Vercel 部署配置指南

## 方法一：使用 Vercel Git 集成（推荐）

1. 访问 https://vercel.com/dashboard
2. 选择你的项目 `phemex`
3. 点击 **Settings** → **Git**
4. 确认 Connected Git Repository 显示 `tanglaoban0-hash/phemex`
5. 这样每次 push 到 GitHub，Vercel 会自动部署

## 方法二：配置 GitHub Secrets（使用 GitHub Actions）

如果要用 GitHub Actions 部署，需要配置以下 Secrets：

### 1. 获取 VERCEL_TOKEN
1. 访问 https://vercel.com/account/tokens
2. 点击 **Create Token**
3. 复制 token

### 2. 获取 ORG_ID 和 PROJECT_ID
在项目根目录运行：
```bash
npx vercel link
# 或查看 .vercel/project.json
```

### 3. 添加到 GitHub Secrets
1. 打开 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加以下三个 secret：
   - `VERCEL_TOKEN` = 上面复制的 token
   - `VERCEL_ORG_ID` = 你的 org id
   - `VERCEL_PROJECT_ID` = 你的 project id

## 建议

推荐**方法一**，更简单，不需要配置 Actions。

如果已经配置了 Git 集成，可以直接删除 `.github/workflows/deploy-frontend.yml` 文件，避免冲突。
