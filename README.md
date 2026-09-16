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
├── dev.sh             本地一键启动（依赖服务 + 前后端）
└── docker-compose.yml 本地依赖（MongoDB + Redis）
```

## 环境要求

| 组件 | 版本 |
| --- | --- |
| Node.js | 18+ |
| JDK | 17 |
| Docker | 用于起 MongoDB / Redis（见下） |
| MongoDB | 27017 |
| Redis | 6379 |

## 本地开发

### 一条命令启动（推荐）

```bash
./dev.sh
```

默认会先 `docker compose up -d` 起好 mongo/redis，再拉起前后端。启动依赖前依次检查：
`docker` 命令是否存在 → `docker-compose.yml` 是否存在 → 守护进程是否可达（
`permission denied` 时明确提示 `newgrp docker`）→ compose 里定义了哪些服务、
当前哪些在跑 → 用到的镜像本地是否已有（Docker Hub 拉不动时打印国内镜像源的补救命令）。
`up -d` 本身幂等，服务已在跑时不会重启容器。

`dev.sh` 还会校验环境、按需创建本地 `application.properties`、缺 `node_modules`
时自动 `npm install`。

拉起服务前先做一次完整构建（日志前缀 `[build]`）：

- **前端** —— `npm run build`（即 `tsc && vite build`）。vite dev 是按需转换的，
  并不读这份 `dist/`，所以这一步的实际价值是让 `tsc` 先跑一遍：类型/打包错误在启动前
  就暴露，而不是等你打开浏览器看白屏。构建失败 `dev.sh` 直接退出，不会留下半启动的服务。
- **后端** —— `./mvnw clean spring-boot:run`，先删 `target/` 再全量重编，
  不会用到陈旧 class；代价是每次启动比纯增量编译多几秒。

然后用进程组把前后端并发拉起，日志按 `[backend]` / `[frontend]` 加前缀。
**Ctrl-C 一次同时停掉两个**（用进程组回收，不会留下孤儿 java 占着 7777）；
依赖服务的容器保持运行，需要停用 `docker compose down`。

| 命令 | 作用 |
| --- | --- |
| `./dev.sh` | 起依赖服务 + 前后端（默认） |
| `./dev.sh --no-deps` | 跳过依赖服务管理（自行准备 mongo/redis） |
| `./dev.sh --backend` / `--frontend` | 只启动其中一个（仍然会起依赖） |
| `./dev.sh -h` | 查看帮助 |

后端**强依赖 MongoDB**：`ArticleService` 的 `@PostConstruct` 启动即查库，
连不上会等 30 秒后启动失败，所以 `dev.sh` 检测到 27017 没监听会直接快速失败。
Redis 只存 session，缺席仅告警。

### 手动启动

#### 1. 启动依赖

`docker-compose.yml` 同时提供 Redis（6379）和 MongoDB（27017）：

```bash
docker compose up -d          # redis + mongo
docker compose ps             # 确认两个都 healthy
```

MongoDB 固定用 7.x：Spring Boot 3.1.4 带的 mongodb 驱动是 4.9.x，官方兼容到
MongoDB 7.0，升 8.0 需要先升驱动。

#### 2. 后端

后端启动 profile 由 `backend/src/main/resources/application.properties` 决定，
该文件不入库，需要自己创建：

```properties
spring.profiles.active=dev
```

然后：

```bash
cd backend
./mvnw spring-boot:run
```

dev profile 监听 **7777**（与 `frontend/.env.dev` 的 `VITE_BASE_URL` 一致），
数据源为 localhost 的 MongoDB(blog 库) 与 Redis，详见
`backend/src/main/resources/application-dev.properties`。

注意 MongoDB 的 `blog` 库初始为空，文章列表为空属正常；发文章需要先登录
（账号硬编码在 `SecurityConfig`）。

#### 3. 前端

```bash
cd frontend
npm install
npm run dev                   # vite --mode dev
```

前端通过 `.env.dev` 里的 `VITE_BASE_URL` 指向后端，默认 `http://localhost:7777/`。

`.env.dev` / `.env.prod` 里都写了 `NODE_ENV`，而 Vite 只接受 `development`，
所以构建和启动各会有一条告警（`NODE_ENV=prod is not supported` /
`NODE_ENV=dev is not supported`），不影响运行 —— 项目里真正用的是
`VITE_BASE_URL` 这类 `VITE_` 前缀变量。

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
