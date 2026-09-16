# TechSpace

个人博客 / 技术内容站点，前端 + 后端合并为单一仓库（monorepo）。

## 项目结构

```
TechSpace/
├── frontend/          React 18 + TypeScript + Vite 4 前端
│   ├── src/           页面、组件、路由、状态管理
│   ├── .env.*         各环境变量（Vite mode）
│   ├── nginx.conf     静态站点 nginx 配置
│   └── update.sh      前端构建 + 发布脚本
├── backend/           Spring Boot 3.1.4 / Java 17 后端
│   ├── src/main/java/com/example/techspace/
│   ├── pom.xml
│   └── mvnw
└── docker-compose.yml 本地依赖（Redis）
```

## 环境要求

| 组件 | 版本 |
| --- | --- |
| Node.js | 18+ |
| JDK | 17 |
| MongoDB | 本地 27017 |
| Redis | 6379（可用 docker compose 启动） |

## 本地开发

### 1. 启动依赖

```bash
docker compose up -d          # Redis
```

MongoDB 需自行在本地 27017 启动。

### 2. 后端

后端启动 profile 由 `backend/src/main/resources/application.properties` 决定，该文件不入库，需要自己创建：

```properties
spring.profiles.active=dev
```

然后：

```bash
cd backend
./mvnw spring-boot:run
```

接口地址见 `backend/src/main/resources/application-dev.properties`。

### 3. 前端

```bash
cd frontend
npm install
npm run dev                   # vite --mode dev
```

前端通过 `.env.dev` 里的 `VITE_BASE_URL` 指向后端，默认 `http://localhost:7777/`。

## 构建与部署

### 前端

`frontend/update.sh` 在**前端目录内**执行，它负责 `rm -rf ./dist && npm run build`，
再 `scp` 到 `root@inforetrieval.com.cn:/var/ssl` 并重启 nginx：

```bash
cd frontend
./update.sh
```

`frontend/nginx.conf` 是服务器上该站点的 nginx 配置（静态托管 `/var/ssl`）。

### 后端

```bash
cd backend
./mvnw clean package
```

产出的 jar 在 `backend/target/` 下。生产 profile（`application-prod.properties`）
监听 `7777`，并自带 pfx 证书做 TLS，前端生产环境通过
`https://inforetrieval.com.cn:7777/` 直连后端（跨域由 nginx 的
`Access-Control-Allow-Origin *` 放行）。

## 关于仓库合并

原 `tech-space-back` 仓库通过 `git subtree` 并入本仓库的 `backend/` 目录，
后端 20 个提交的历史完整保留（作为合并提交的第二个父节点）。

注意：`git log -- backend/` 这类**路径过滤**查不到导入前的后端提交，
因为那些提交的文件路径是 `src/...` 而非 `backend/src/...`。需要浏览后端历史时用：

```bash
git log --oneline            # 全部提交，按时间排列
git log --oneline <subtree-merge-commit>^2   # 只看导入进来的后端历史
```

后续如需从原仓库同步后端改动（不推荐，已改为单仓开发）：

```bash
git subtree pull --prefix=backend <tech-space-back 仓库地址> main
```
