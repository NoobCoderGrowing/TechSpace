#!/usr/bin/env bash
#
# 本地开发启动脚本 —— 拉起 docker-compose.yml 的依赖服务，再并发起前后端
#
#   ./dev.sh              启动依赖服务 + 前后端（默认）
#   ./dev.sh --backend    只启动后端
#   ./dev.sh --frontend   只启动前端
#   ./dev.sh --no-deps    跳过依赖服务管理（自行准备 mongo/redis）
#   ./dev.sh -h           查看帮助
#
# Ctrl-C 一次即同时停掉前后端（依赖服务的容器保留运行）。
#
# 启动前先做一次完整构建：前端 npm run build，后端 ./mvnw clean spring-boot:run。
# 前后端都以 dev 环境启动：后端 profile=dev（SPRING_PROFILES_ACTIVE 覆盖
# application.properties 里的 prod），前端 vite --mode dev（读 .env.dev）。
#
# 后端固定用 JDK 17 编译（pick_jdk17 挑，挑不到就退出）：环境里的 java 若是更高的
# 版本，Lombok 会**静默**失效 —— 编译报几十条 cannot find symbol 而没有一句
# 相关警告。原因和实测数字见下面 pick_jdk17 那段注释。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

# 这些端口是对应配置文件里写死的（backend/.../application-dev.properties、
# frontend/.env.dev、docker-compose.yml），不要在这里加覆盖开关假装能改——
# 改了脚本的检查端口而服务仍监听旧端口，只会更难排查。
BACKEND_PORT=7777
FRONTEND_PORT=5173
MONGO_PORT=27017
REDIS_PORT=6379

WITH_DEPS=1
RUN_BACKEND=1
RUN_FRONTEND=1

if [ -t 1 ]; then
  RST=$'\033[0m'; DIM=$'\033[2m'
  C_BACK=$'\033[36m'; C_FRONT=$'\033[35m'
  C_INFO=$'\033[33m'; C_ERR=$'\033[31m'
else
  RST=; DIM=; C_BACK=; C_FRONT=; C_INFO=; C_ERR=
fi

info() { printf '%s[dev]%s %s\n' "$C_INFO" "$RST" "$*"; }
warn() { printf '%s[dev] 警告:%s %s\n' "$C_INFO" "$RST" "$*" >&2; }
fail() { printf '%s[dev] 错误:%s %s\n' "$C_ERR" "$RST" "$*" >&2; exit 1; }

usage() {
  sed -n '3,15p' "${BASH_SOURCE[0]}" | sed 's/^#\s\?//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --no-deps)  WITH_DEPS=0 ;;
    --deps)     WITH_DEPS=1 ;;   # 兼容旧用法：现在已是默认行为
    --backend)  RUN_FRONTEND=0 ;;
    --frontend) RUN_BACKEND=0 ;;
    -h|--help)  usage; exit 0 ;;
    *)          fail "未知参数: $1（用 -h 查看用法）" ;;
  esac
  shift
done

# 端口是否已被占用
port_open() {
  timeout 1 bash -c "</dev/tcp/127.0.0.1/$1" 2>/dev/null
}

# ---------- 后端 JDK ----------
#
# 本项目**编译期**必须是 JDK 17，不是"17 及以上"。原因在 Lombok：
#
#   JDK 23 起 javac 不再自动运行「只出现在 classpath 上」的注解处理器（要显式
#   -proc:full 或 --processor-path），而 Lombok 恰恰就是这样挂进来的 —— pom 里它是
#   一条 <optional> 依赖，没有配 annotationProcessorPaths。于是 @Data 不生成任何
#   getter/setter，编译一次性报几十条
#       cannot find symbol: method getTitle() / isDeleted() / get_id() ...
#   全部指向业务代码，看着像代码被改坏了，实际只是用错了 JDK。
#
# 实测：JDK 25 下 59 条错误，JDK 17 下 0 条。最坑的是 javac 对此**一句警告都不打**
# （输出里没有任何 "annotation processing" 字样），所以症状和"有人删了 getter"一模一样。
# 踩到的机器正是这种两套 JDK 并存的环境：JAVA_HOME 指向 JDK 25，PATH 上的 java 是 17
# —— mvnw 认 JAVA_HOME，所以只看 PATH 上那个 java 的版本检查会说"没问题"。
#
# 所以挑不到 17 就**硬失败**，而不是像原来那样只 warn 一句再照常启动 —— 只警告的
# 下场就是上面那堆看不懂的报错（backend/update.sh 里为同一个教训写过一整段）。
# 要换 JDK 就用 JAVA_HOME 指过来，它是候选里的第一个。

# 取 java 主版本号。和 backend/update.sh 里远端那份 java_major_of 是同一套写法
# （两边各留一份，脚本都是自包含的）：不锚行号 —— 设了 JAVA_TOOL_OPTIONS 时版本行
# 会被挤到第 2 行；取前两段 —— Java 8 的 "1.8.0_392" 主版本号在第二段，只看第一段
# 会读成 "1"。
java_major_of() {
  "$1" -version 2>&1 \
    | sed -nE 's/.*version "([0-9]+)(\.([0-9]+))?.*/\1 \3/p' \
    | head -1 | awk '{ print ($1 == 1 && $2 != "") ? $2 : $1 }'
}

# 挑一个主版本正好是 17 的 JDK，根目录写进 BACKEND_JAVA_HOME；挑不到返回 1（试过的
# 候选留给调用方打错误信息）。候选顺序：$JAVA_HOME → PATH 上那个 java 所属的 JDK →
# 常见安装目录。
#
# 只认 17、不认 ">= 17"，理由见上面那段。别对着 backend/update.sh 抄：那边挑 >= 17
# 是在挑**运行** jar 的 JVM（class 61 谁都能跑），和这里的编译期要求是两件事。
pick_jdk17() {
  local h java m
  local homes=()
  [ -n "${JAVA_HOME:-}" ] && homes+=("$JAVA_HOME")
  # PATH 上的 java 不能直接砍掉 /bin/java 当成 JDK 根：它可能是 sdkman 之类的
  # shim（$HOME/.sdkman/candidates/java/current/bin/java），砍完得到的是 shim 目录。
  # readlink -f 解到真实文件，再往上两层才是根；解不出来就跳过，目录扫描一般能兜住。
  if command -v java >/dev/null 2>&1; then
    java="$(readlink -f "$(command -v java)" 2>/dev/null || true)"
    [ -n "$java" ] && homes+=("${java%/bin/java}")
  fi
  for h in /usr/lib/jvm/* /usr/java/* /usr/local/* /opt/* /opt/*/* \
           "$HOME"/.sdkman/candidates/java/*; do
    [ -d "$h" ] && homes+=("$h")
  done
  JDK_TRIED=""
  for h in "${homes[@]}"; do
    [ -x "$h/bin/java" ] || continue
    m="$(java_major_of "$h/bin/java" || true)"
    [ -n "$m" ] || continue
    JDK_TRIED="${JDK_TRIED}${h}(java${m}) "
    [ "$m" = 17 ] && { BACKEND_JAVA_HOME="$h"; return 0; }
  done
  return 1
}

# ---------- 前置检查 ----------

if [ "$RUN_BACKEND" = 1 ]; then
  BACKEND_JAVA_HOME=""
  if ! pick_jdk17; then
    fail "找不到 JDK 17（本项目编译期必须用它，高版本会让 Lombok 静默失效）
${DIM}       试过的候选：${JDK_TRIED:-（一个都没找到）}
       装一个 JDK 17，或显式指一个：
         JAVA_HOME=/path/to/jdk-17 ./dev.sh
       来龙去脉见脚本里 pick_jdk17 上面那段注释。${RST}"
  fi
  [ "$BACKEND_JAVA_HOME" = "${JAVA_HOME:-}" ] \
    || info "后端 JDK：${BACKEND_JAVA_HOME}${DIM}（不用环境里那个 java，原因见脚本注释）${RST}"
fi

if [ "$RUN_FRONTEND" = 1 ]; then
  command -v node >/dev/null 2>&1 || fail "找不到 node，需要 Node.js 18+"
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    info "frontend/node_modules 不存在，先执行 npm install…"
    ( cd "$FRONTEND_DIR" && npm install )
  fi
fi

# ---------- 后端 profile ----------
#
# 后端必须跑 dev profile，否则本地起来的是个"半个后端"：
# application-prod.properties 里钉了 server.ssl.* （TLS）和
# server.servlet.session.cookie.secure=true，7777 上是个 **HTTPS** 监听；
# 而 frontend/.env.dev 的 VITE_BASE_URL 是 http://localhost:7777/ —— 明文 HTTP
# 打到 TLS 端口上连握手都过不去，浏览器里就是一片网络错误。就算绕过去，
# secure cookie 在 HTTP 下也不会被浏览器存/回传，现象是"登录成功，下一个请求
# 又是匿名的"。
#
# 为什么不能改 application.properties 来定这件事（原先就是这么写的）：
#   ① 那个文件**是入库的**：git ls-files 能看到它，.gitignore 里没有它的条目
#      （文件里"本文件被 .gitignore 忽略，不会提交"那句注释是错的），里面写着
#      spring.profiles.active=prod。所以原先那个 `if [ ! -f "$props" ]` 永远不成立，
#      从来就没生效过，./dev.sh 一直在起 prod。
#   ② 就算文件不存在时补一份也没用 —— 它是**打包进 jar 的默认 profile**，
#      backend/update.sh 在服务器上跑的就是它；把本地那个文件改成 dev，
#      等于顺手把上线产物也改了。
#
# 所以就显式传环境变量：环境变量优先级高于 properties 文件（实测过），
# 且只作用于 dev.sh 拉起的这个进程，磁盘上的文件一个字节都不动。
BACKEND_PROFILE=dev

if [ "$RUN_BACKEND" = 1 ]; then
  [ -f "$BACKEND_DIR/src/main/resources/application-$BACKEND_PROFILE.properties" ] \
    || fail "找不到 application-$BACKEND_PROFILE.properties，profile=$BACKEND_PROFILE 无从加载"

  # 文件里写的是别的 profile 就说一声。不说的话，将来看到日志里是 dev、文件里是 prod
  # 的人会以为是哪儿串了 —— 这里明确它是被覆盖掉的。
  file_profile="$(sed -nE 's/^[[:space:]]*spring\.profiles\.active[[:space:]]*=[[:space:]]*([^[:space:]]+).*/\1/p' \
    "$BACKEND_DIR/src/main/resources/application.properties" | tail -n 1)"
  if [ -n "$file_profile" ] && [ "$file_profile" != "$BACKEND_PROFILE" ]; then
    info "application.properties 里写的是 profile=$file_profile，本次用 SPRING_PROFILES_ACTIVE=$BACKEND_PROFILE 覆盖（只影响这次启动）"
  fi
fi

# 端口冲突早报错，别等到启动一半才失败
# 后端：7777 被占 Tomcat 会直接启动失败，所以这里硬失败
if [ "$RUN_BACKEND" = 1 ] && port_open "$BACKEND_PORT"; then
  fail "端口 $BACKEND_PORT 已被占用，后端无法启动。先腾出该端口，或改
       backend/src/main/resources/application-dev.properties 里的 server.port
       （同时要改 frontend/.env.dev 的 VITE_BASE_URL）"
fi
# 前端：vite 默认非 strictPort，5173 被占会自动顺延到 5174 并照常运行，故只提示
if [ "$RUN_FRONTEND" = 1 ] && port_open "$FRONTEND_PORT"; then
  warn "端口 $FRONTEND_PORT 已被占用，vite 会自动顺延到下一个可用端口，以它打印的 Local 地址为准"
fi

# ---------- 依赖服务 ----------

# 把标准镜像名映射到可达的国内镜像源（Docker Hub 在部分网络下不可达）
mirror_of() {
  case "$1" in
    */*) printf 'docker.m.daocloud.io/%s' "$1" ;;
    *)   printf 'docker.m.daocloud.io/library/%s' "$1" ;;
  esac
}

# 启动 docker-compose.yml 里定义的服务。启动前把各种"不存在"先查一遍，
# 免得等到 compose 报一堆错再回头找原因。
ensure_deps() {
  local compose_file="$ROOT/docker-compose.yml"

  # 1) docker CLI 是否存在
  if ! command -v docker >/dev/null 2>&1; then
    fail "找不到 docker 命令。依赖服务需要 docker；若你已有可用的 mongo/redis，加 --no-deps 跳过"
  fi

  # 2) compose 文件是否存在
  [ -f "$compose_file" ] || fail "找不到 $compose_file，无法启动依赖服务"

  # 3) docker 守护进程是否可达。最常见的坑：usermod -aG docker 后没重新登录，
  #    当前会话不在 docker 组，这里会报 permission denied。
  if ! docker info >/dev/null 2>&1; then
    fail "连不上 docker 守护进程。
${DIM}       若报 permission denied：本会话不在 docker 组（加组要重新登录才生效），
       临时办法 newgrp docker，或加 --no-deps 自行准备依赖${RST}"
  fi

  # 4) compose 文件里定义了哪些服务
  local defined
  defined="$(docker compose -f "$compose_file" config --services 2>/dev/null)"
  [ -n "$defined" ] || fail "$compose_file 里没有解析到任何服务"
  info "compose 定义的服务：$(echo "$defined" | tr '\n' ' ')"

  # 5) 各服务当前的运行状态
  local running
  running="$(docker compose -f "$compose_file" ps --services --status running 2>/dev/null)"
  if [ -n "$running" ]; then
    info "已在运行：$(echo "$running" | tr '\n' ' ')"
  else
    info "当前没有服务在运行"
  fi

  # 6) 镜像是否已在本地。Docker Hub 在部分网络下不可达，缺镜像时 compose
  #    会去拉然后失败，不如提前把补救命令打出来。
  local img missing=()
  while read -r img; do
    [ -n "$img" ] || continue
    docker image inspect "$img" >/dev/null 2>&1 || missing+=("$img")
  done < <(docker compose -f "$compose_file" config --images 2>/dev/null)

  if [ "${#missing[@]}" -gt 0 ]; then
    warn "以下镜像本地不存在，compose 会尝试去 Docker Hub 拉取；若这网络下拉不动，先手动补："
    for img in "${missing[@]}"; do
      printf '%s       docker pull %s && docker tag %s %s%s\n' \
        "$DIM" "$(mirror_of "$img")" "$(mirror_of "$img")" "$img" "$RST" >&2
    done
  fi

  # 7) up -d 是幂等的：全在跑时输出 up to date，不会重启容器
  docker compose -f "$compose_file" up -d

  # 8) compose up -d 是异步返回的，容器还要几秒才 accept 连接
  if [ "$RUN_BACKEND" = 1 ]; then
    for p in "$MONGO_PORT" "$REDIS_PORT"; do
      info "等待端口 $p 就绪…"
      for _ in $(seq 1 30); do
        if port_open "$p"; then break; fi
        sleep 1
      done
    done
  fi
}

if [ "$WITH_DEPS" = 1 ]; then
  ensure_deps
else
  info "--no-deps 已指定，跳过依赖服务管理"
fi

# MongoDB 是硬依赖，不是"连不上"那么轻：ArticleService 的 @PostConstruct
# (hourlyUpdate) 启动即查库，连不上会干等 30 秒 serverSelectionTimeout，
# 然后 context 启动失败、进程退出。所以这里快速失败，别让人对着超时堆栈猜。
if [ "$RUN_BACKEND" = 1 ] && ! port_open "$MONGO_PORT"; then
  fail "MongoDB (端口 $MONGO_PORT) 未运行，后端启动必然失败。
${DIM}       先执行: ./dev.sh --deps${RST}
${DIM}       或:     cd $ROOT && docker compose up -d${RST}"
fi

# Redis 只用于存 session，缺席不会拦住启动，降级为警告
if [ "$RUN_BACKEND" = 1 ] && ! port_open "$REDIS_PORT"; then
  warn "Redis (端口 $REDIS_PORT) 未运行，登录态/session 会不可用；可执行 ./dev.sh --deps 启动"
fi

# ---------- 构建 ----------
#
# 前端先单独构建一次。注意 vite dev 是按需转换的，并不读这里的 dist ——
# 这一步的价值在于 tsc 会先跑一遍，类型/打包错误在启动前就暴露出来，
# 而不是等你打开浏览器看白屏。构建不过就直接退出，不留半启动的服务。
# 后端不在这里单独编译：下面的 `mvnw clean spring-boot:run` 本身就是全量重编。

run_frontend_build() {
  ( cd "$FRONTEND_DIR" && npm run build ) 2>&1 \
    | sed -u "s/^/${DIM}[build]${RST} /"
}

if [ "$RUN_FRONTEND" = 1 ]; then
  info "前端构建中…${DIM}npm run build = tsc && vite build${RST}"
  # 管道 + pipefail：npm 的退出码会穿过 sed 传出来，构建失败能正确判定
  if ! run_frontend_build; then
    fail "前端构建失败，已中止（修掉上面的 tsc/vite 报错再启动）"
  fi
  info "前端构建完成 → frontend/dist"
fi

# ---------- 启动 ----------

PIDS=()

# $1=名字 $2=颜色 $3=工作目录 $4...=命令
start_service() {
  local name="$1" color="$2" dir="$3"; shift 3
  # stdin 一定要接 /dev/null，不能继承终端：上面的 set -m 让每个服务独占一个
  # 后台进程组，而后台进程组不持有控制终端。只要有东西去读 stdin —— npm/node
  # 就会 —— 内核直接发 SIGTTIN 把它停住（进程状态 T），现象是端口在监听、
  # TCP 能握手，却一个字节都不回，页面永远转圈。
  # 后端 JVM 从不读 stdin，所以只有前端会中招。
  ( cd "$dir" && exec "$@" ) \
    < /dev/null \
    > >(sed -u "s/^/${color}[${name}]${RST} /") 2>&1 &
  PIDS+=("$!")
}

CLEANED=0
cleanup() {
  [ "$CLEANED" = 1 ] && return 0
  CLEANED=1
  printf '\n'
  info "正在停止服务…"
  local pid alive
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill -TERM -- "-$pid" 2>/dev/null || true
  done
  # 最多等 5 秒优雅退出，之后强杀
  for _ in 1 2 3 4 5; do
    sleep 1
    alive=0
    for pid in "${PIDS[@]:-}"; do
      [ -n "$pid" ] && kill -0 -- "-$pid" 2>/dev/null && alive=1
    done
    [ "$alive" = 0 ] && break
  done
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill -KILL -- "-$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  info "已全部停止。"
}

# HUP 也要接：直接关掉终端窗口时发的是 SIGHUP，不接就会留下孤儿进程
trap 'cleanup; exit 130' INT TERM HUP

# 只在 fork 的这一刻开启 job control：让每个服务独占一个进程组，
# 这样退出时能整组杀掉（否则 mvn 派生的 java 进程会变成孤儿继续占着 7777）。
# fork 完成后立刻关掉，否则 bash 会把 "[1]+ Terminated" 这类作业提示打进输出里。
set -m

if [ "$RUN_BACKEND" = 1 ]; then
  info "后端启动中…${DIM}clean 全量重编，首次会久一点${RST} Spring Boot (profile=${BACKEND_PROFILE}) → http://localhost:${BACKEND_PORT}"
  # 用 env 只给后端这一个进程带上 profile 和 JAVA_HOME：写成 export 的话前端那份
  # 环境也会跟着脏。JAVA_HOME 就是上面 pick_jdk17 挑出来的那个，mvnw 认它
  # （只认 PATH 上那个 java 就不够了 —— 环境里的 JAVA_HOME 会压过 PATH）。
  start_service backend "$C_BACK" "$BACKEND_DIR" \
    env "SPRING_PROFILES_ACTIVE=$BACKEND_PROFILE" "JAVA_HOME=$BACKEND_JAVA_HOME" \
    ./mvnw clean spring-boot:run
fi
if [ "$RUN_FRONTEND" = 1 ]; then
  info "前端启动中… Vite (mode=dev → .env.dev) → http://localhost:${FRONTEND_PORT}"
  # `npm run dev` 本身已经是 `vite --mode dev`，这里再显式带一次是为了让
  # "dev 环境"这个承诺不依赖 package.json 里那一行脚本：谁把它改成裸 vite，
  # vite 就退回 mode=development、只读 .env（不再读 .env.dev），
  # 而 VITE_BASE_URL 恰恰只写在 .env.dev 里 —— 接口地址会变成 undefined。
  # 重复传两次 --mode 无副作用（后者生效，实测过）。
  start_service frontend "$C_FRONT" "$FRONTEND_DIR" npm run dev -- --mode dev
fi

set +m

if [ "$RUN_BACKEND" = 1 ] && [ "$RUN_FRONTEND" = 1 ]; then
  info "已启动，Ctrl-C 停止。${DIM}后端 :${BACKEND_PORT} / 前端 :${FRONTEND_PORT}(被占则顺延，以 vite 打印为准) / 依赖 mongo:${MONGO_PORT} redis:${REDIS_PORT}${RST}"
elif [ "$RUN_BACKEND" = 1 ]; then
  info "已启动，Ctrl-C 停止。${DIM}后端 :${BACKEND_PORT}${RST}"
else
  info "已启动，Ctrl-C 停止。${DIM}前端 :${FRONTEND_PORT}${RST}"
fi

# 任一服务退出则整体收工
wait -n || true
[ "$CLEANED" = 1 ] || info "有服务已退出，正在停止其余服务…"
cleanup
