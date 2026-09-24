#!/usr/bin/env bash
#
# 后端发布脚本 —— 本地打包 → scp 上传 → 远端 nohup 重启
#
#   ./update.sh                构建（跑测试）+ 上传 + 重启
#   ./update.sh --skip-tests   跳过测试（构建机上没起 mongo 时用）
#   ./update.sh --no-start     只构建 + 上传，不动正在跑的服务
#   ./update.sh --rollback     回滚到上一次发布的 jar 并重启
#   ./update.sh -h             查看帮助
#
# 和 frontend/update.sh 分工：那边发静态文件到 /var/ssl，这边发 jar。
#
# 可覆盖的环境变量（放在命令前即可，例如 REMOTE_HOST=1.2.3.4 ./update.sh）：
#   REMOTE_USER / REMOTE_HOST / SSH_PORT / REMOTE_DIR / PROFILE / JAVA_HOME
#   REMOTE_JAVA  用哪个 java 起服务。**一般不用设** —— 留空时远端自己探测
#                （找主版本 >= 17 的，含 /usr/java/*/bin/java）。探测结果每次都会
#                打印出来。只有探测挑错了才需要显式指定全路径。
#
# **要能登录远端**：本脚本不禁交互提示，所以要么已经配好免密公钥，要么在提示时输入
# $REMOTE_USER 的密码（跟 frontend/update.sh 一样）。第一次连接问一次密码，之后
# prepare / 上传 / 切换这几步复用同一条连接，不会再问 —— 见下面 SSH_COMMON。
# 代价是它需要交互式终端：要无人值守（cron/CI）就得配免密公钥。
#
# ─────────────────────────────────────────────────────────────────────────────
# 为什么比 frontend/update.sh 啰嗦这么多 —— 每一条都是下面代码在挡的坑：
#
# 1) **绝不能原地覆盖正在运行的 jar。** 运行中的 JVM 打开着这个 jar，Spring Boot 的
#    类加载器会在运行期按需从里面读类。scp 直接覆盖 = 截断重写，之后任何一个还没加载
#    的类都会以 ZipException / NoClassDefFoundError 炸出来，而且常常在启动几分钟后才炸。
#    所以流程是「上传成 .new → 停旧进程 → mv 就位」，顺带白送一个 .prev 供回滚。
#
# 2) **prod profile 必须显式指定，不能靠 jar 里的默认值。** 打进 jar 的
#    application.properties 是**入库**的（内容随你本地怎么改就怎么打包），它的
#    spring.profiles.active 决定了默认 profile。以 dev 启动的后果不是"少个功能"：
#    明文 HTTP、没有 TLS、frontend.origin 指向 localhost，而前端 bundle 里烧死的是
#    https://inforetrieval.com.cn:7777/ —— 现象是"站点能打开但数据全空"。
#    所以下面启动时永远显式带 --spring.profiles.active，不依赖文件里的当前值。
#
# 3) **GitHub 的环境变量要进到 nohup 那个进程里。** ssh 执行的是非交互 shell，本地
#    export 不会跟过去；而 client_secret 又绝不能出现在命令行上（同机器上 ps 可见）。
#    所以从远端的 $REMOTE_DIR/backend.env（权限 600）读，见文末说明。
#
# 4) **就绪判定看日志，不看 sleep。** 启动是异步的，固定 sleep 要么不够要么白等。
#    这里等日志里出现 "Started TechSpaceApplication"，进程提前死掉就立刻报错并打日志尾巴。
#
# 5) **认证：原来写死 BatchMode=yes，等于"没有免密公钥就一定失败"。** 这台机器一直是
#    用密码登录的（frontend/update.sh 就是这么发的，它没有 BatchMode），而 BatchMode
#    会同时禁掉**密码提示**和**私钥口令提示**，于是一上来就回
#      Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password)
#    —— 看着像密钥不对，其实根本没给过输入机会（而且本机那把 id_ed25519 还带口令、
#    又没有跑 ssh-agent，就算装了公钥也一样过不去）。现在改成密码 + 连接复用。
#
# 6) **启动用的 java 必须是全路径，而且检查用的和启动用的必须是同一个。** ssh 执行的是
#    **非交互** shell，PATH 是 sshd 的默认值 —— 和你手敲命令时那个 PATH 不是一回事。
#    这台机器的 JDK 17 在 /usr/java/jdk-17.0.10，是交互式环境里才进 PATH 的，非交互
#    环境下 `java` 落到系统那个 Java 8 上。原来两处都错：start_instance 里写死了 `java`
#    （REMOTE_JAVA 只被 prepare 拿去做版本检查，对启动毫无作用），而那个检查只 warn 不拦。
#    于是流程一路走到停旧进程 → 换 jar，才由 JVM 报 UnsupportedClassVersionError
#    （class 61 需要 17，系统 java 只认到 52）；更要命的是**回滚用的还是同一个错 java**，
#    站点就被留在"旧进程已停、新实例起不来"的空档里。
#    现在：prepare 探测出一个 >= 17 的 java（找不到就硬失败，且发生在本地构建之前、
#    动远端任何东西之前），把全路径回报本地，本地再传给 deploy/rollback。
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------- 可调参数 ----------

REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST:-inforetrieval.com.cn}"
SSH_PORT="${SSH_PORT:-22}"
# 默认目录。远端已有实例在跑时会自动沿用它的目录（见远端脚本的 prepare 分支），
# 所以只有第一次部署才真正用到这个默认值。第一次部署前请确认这里指向你想要的位置。
REMOTE_DIR="${REMOTE_DIR:-/opt/spring_apps}"
PROFILE="${PROFILE:-prod}"
# 用哪个 java 起服务。**留空 = 让远端自己探测**（见远端脚本 prepare 里的候选列表：
# 显式指定 → PATH 上的 → /usr/java/*/bin/java 等等，取第一个主版本 >= 17 的）。
# 探测结果会以 JAVA=<全路径> 回报给本地，再传给启动那一步。
# 只有探测结果不对时才需要显式指定：
#   REMOTE_JAVA=/usr/java/jdk-17.0.10/bin/java ./update.sh
#
# ★ 这里原来默认是裸 `java`，而且**启动那行还是写死的 `java`**（REMOTE_JAVA 只被
#   prepare 拿去做版本检查），两个问题叠在一起：
#   · ssh 执行的是**非交互** shell，PATH 是 sshd 的默认值，跟你手敲命令时那个 PATH
#     不是一回事。这台机器的 JDK 17 装在 /usr/java/jdk-17.0.10 —— 那是 profile/sdkman
#     之类在**交互式**环境里加进 PATH 的，非交互环境里 `java` 落到系统那个 Java 8 上；
#   · 于是检查用的是错的 java、启动用的也是错的 java，而检查只 warn 不拦。
#   现象就是这次的：旧进程已经停掉、新 jar 换上去了，JarLauncher 才
#   UnsupportedClassVersionError 退出（class 61 需要 17，系统 java 只认到 52）。
REMOTE_JAVA="${REMOTE_JAVA:-}"

# 前端 bundle 里 VITE_BASE_URL 写死了 7777，改这里的话前端也要重新构建。
BACKEND_PORT="${BACKEND_PORT:-7777}"

# 远端文件名。改名的话 pidfile/日志名会跟着走，但别用带空格的名字。
REMOTE_JAR_NAME="tech-space.jar"
HEALTH_URL="${HEALTH_URL:-https://${REMOTE_HOST}:${BACKEND_PORT}/public/isHealthy}"

# 等多久算启动成功 / 等多久算旧进程停下来了
START_WAIT=90
STOP_WAIT=30
# console.log 超过这么多 MB 就在启动前轮转一次（nohup 没有 logrotate，不管它会一直
# 涨到把磁盘写满）。只管 console.log 一份 —— backend.log 由日志框架自己按天 + 20MB
# 滚动、并删除 30 天前的归档，见 log4j2-spring.xml，不用脚本插手。
# prod 开着 Spring Security 的 DEBUG（两个 properties 文件里都写着），量不小，
# 所以这个 20MB 和配置里的 20MB 是同一个数量级的考量。
LOG_MAX_MB=20

SKIP_TESTS=0
NO_START=0
ROLLBACK=0

if [ -t 1 ]; then
  RST=$'\033[0m'; DIM=$'\033[2m'
  C_INFO=$'\033[33m'; C_ERR=$'\033[31m'; C_OK=$'\033[32m'
else
  RST=; DIM=; C_INFO=; C_ERR=; C_OK=
fi

info() { printf '%s[deploy]%s %s\n' "$C_INFO" "$RST" "$*"; }
ok()   { printf '%s[deploy]%s %s\n' "$C_OK"   "$RST" "$*"; }
warn() { printf '%s[deploy] 警告:%s %s\n' "$C_INFO" "$RST" "$*" >&2; }
fail() { printf '%s[deploy] 错误:%s %s\n' "$C_ERR" "$RST" "$*" >&2; exit 1; }

usage() { sed -n '3,12p' "${BASH_SOURCE[0]}" | sed 's/^#\s\?//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-tests) SKIP_TESTS=1 ;;
    --no-start)   NO_START=1 ;;
    --rollback)   ROLLBACK=1 ;;
    -h|--help)    usage; exit 0 ;;
    *)            fail "未知参数: $1（用 -h 查看用法）" ;;
  esac
  shift
done

# 远端脚本是靠 ssh 把参数用空格拼成一条命令传过去的，路径带空格会把参数拆错。
case "$REMOTE_DIR" in *[[:space:]]*) fail "REMOTE_DIR 不能含空格/制表符: '$REMOTE_DIR'" ;; esac

SSH_TARGET="$REMOTE_USER@$REMOTE_HOST"

# ── 连接复用 ────────────────────────────────────────────────────────────────
# 一次部署要走三次 ssh/scp（prepare、上传、切换），不复用就是输三次密码。
# ControlMaster 让第一次连接建一条后台主连接（就是这里提示输密码的那次），
# 之后同一 ControlPath 上的 ssh/scp 都挂在它上面复用，不再问密码。
# 不再有 BatchMode=yes：它会禁掉所有交互提示（密码、私钥口令、host key 确认），
# 而这台机器靠密码登录 —— 原因见文件头第 5 条。
SSH_CONTROL_PATH="${SSH_CONTROL_PATH:-/tmp/ssh-techspace-%r@%h:%p}"
SSH_COMMON=(-o ConnectTimeout=10 -o ControlMaster=auto
            -o ControlPath="$SSH_CONTROL_PATH" -o ControlPersist=60)

# 端口选项**不放进** SSH_COMMON：ssh 用 -p，scp 用 -P（scp 的小写 -p 是"保留时间戳"，
# 搞混了不会报错、只会静默变成另一件事），所以由各调用点自己带上端口。
# %r/%h/%p 这些占位符由 ssh/scp 拿**自己的目标**展开，所以这里只需要原样的字符串。

# 收尾关掉主连接：ControlPersist=60 会让 socket 再留 60 秒，留着没意义，
# 而且 /tmp 里的残留 socket 会让下次连接的诊断变糊涂。没有主连接时它只是报一句
# "Control socket connect: No such file or directory"，已经吞掉了。
close_ssh_master() {
  ssh -O exit -o ControlPath="$SSH_CONTROL_PATH" "$SSH_TARGET" 2>/dev/null || true
}
trap close_ssh_master EXIT

port_open() { timeout 1 bash -c "</dev/tcp/127.0.0.1/$1" 2>/dev/null; }

# ---------- 远端脚本 ----------
#
# 用 heredoc + `bash -s` 把整段脚本喂给远端 bash，而不是拼一长串带引号的命令：
# 拼字符串的话每多一层嵌套引号就多一个坑，而且本地 shell 会先把它展开一遍。
# 参数走位置参数传，远端 do_deploy() 后面直接用 $1..$9。
remote_run() {
  ssh -p "$SSH_PORT" "${SSH_COMMON[@]}" "$SSH_TARGET" "bash -s" -- "$@" <<'REMOTE_SCRIPT'
set -euo pipefail

# 这个 heredoc 是被引号（'REMOTE_SCRIPT'）包住的，本地不会展开，所以下面的数字
# 必须是字面量 —— 改了本地那份 START_WAIT/STOP_WAIT 记得同步这里。
readonly START_WAIT=90
readonly STOP_WAIT=30

# 必须和本地的 REMOTE_JAR_NAME 一致（本地负责上传到这个名字，远端负责找/换这个名字）。
readonly CURRENT_DIR_NAME="tech-space.jar"

# 启动用的 java **全路径**，由各 ACTION 分支在调用 start_instance 之前赋值。
# 三个动作拿到的都是同一个值：prepare 探测出来 → stdout 回报本地 → 本地再作为参数
# 传给 deploy/rollback。这样"检查用的 java"和"启动用的 java"必然是同一个 ——
# 原来 start_instance 里写死 `java`（PATH 上那个），检查说没问题、启动照样用错的，
# 是这次故障的直接原因。
RUNTIME_JAVA=""

# 取 java 主版本号。Java 8 及以前第一行是 `java version "1.8.0_392"`，主版本号在
# **第二段**；9 以后是 `openjdk version "17.0.10"`，在第一段。只取第一段的话
# Java 8 会被读成 "1"，报错信息就成了"找到 java1"，看不出其实是 8。
#
# 不锚在第 1 行（原来是 `1s/.../p`）：设了 JAVA_TOOL_OPTIONS 或 _JAVA_OPTIONS 时，
# java 会先在**第 1 行**打 `Picked up JAVA_TOOL_OPTIONS: ...`，版本行被挤到第 2 行，
# 锚行号的话一个候选都读不出主版本号、全被判成不可用（现象是"明明装了 17 却说没找到"）。
# 改成匹配任意一行里第一个 `version "..."`；`java -version` 的输出里只有那一行有这形状
# （下一行是 `(build 1.8.0_392-b08)`，不含 version "）。
#
# 注意模式里**不能**要求主版本后面紧跟 `"`：`"17.0.10"` 里 `[0-9]+` 只会吃到 `17`，
# 后面跟的是 `.` 不是 `"`，整个模式就匹配不上（实测过：写成 `([0-9]+)(\.([0-9]+))?"`
# 对 "17.0.10" 一行输出都没有，函数对**所有** java 都返回空 —— 那会变成"装了 17 也说没找到"）。
# 所以让尾巴随便接 `.*`，只取前两段；第二段在 "17.0.10" 上是 "0"、在 "1.8.0_392" 上是 "8"，
# 够用来区分 1.x 和 9+。
java_major_of() {
  "$1" -version 2>&1 \
    | sed -nE 's/.*version "([0-9]+)(\.([0-9]+))?.*/\1 \3/p' \
    | head -1 | awk '{ print ($1 == 1 && $2 != "") ? $2 : $1 }'
}

# 远端有没有开这个端口，用于"旧进程停了没""端口是不是被别人占着"
remote_port_open() { timeout 1 bash -c "</dev/tcp/127.0.0.1/$1" 2>/dev/null; }

# 在 /proc 里找命令行中**有一个参数正好等于** $1 的进程，输出它的 pid 或空串。
# 「找出正在跑的那个实例」只有这一条路，find_pid 和 start_instance 都走它。
#
# 为什么不写 pgrep -f -- "$dir/$CURRENT_DIR_NAME"：pgrep -f 拿这个串去匹配**整条命令行
# 的子串**，而凡是提到这个文件名的命令都会命中 —— 包括这个脚本自己的调用方。实测踩到
# 两次：调用方的命令行里带着 `.../tech-space.jar.new`（部署时 scp 的目标就是这个名字），
# 于是 find_pid 返回了**调用方**的 pid，接着 stop_instance 把它 TERM 掉了，
# 整个脚本连同 ssh 一起消失，退出码 143/144，什么都不打印，看着像凭空中断。
# 现网里同样形状的还有 tech-space.jar.prev / .rollback-<时间戳> / .failed-<时间戳>、
# 以及任何人手工敲的 tail -f .../tech-space.jar.bak —— 都会被误伤。
# 逐参数精确比对就不会：`java -jar "$dir/$CURRENT_DIR_NAME"` 里那个参数不多不少正是它。
scan_pid() {
  local want="$1" p pid args
  for p in /proc/[0-9]*; do
    pid="${p#/proc/}"
    [ "$pid" = "$$" ] && continue
    # 2>/dev/null 必须写在 < 的**前面**：重定向是从左到右处理的，进程恰好在这一刻退出时
    # /proc/$pid/cmdline 会消失，而把 2>/dev/null 写在后面挡不住这次**输入重定向失败**
    # （是 shell 自己报的错，那时 2>/dev/null 还没生效），于是凭空多一行
    # "No such file or directory"。扫 /proc 必然撞上这个竞态。
    args="$(tr '\0' '\n' 2>/dev/null < "$p/cmdline" || true)"
    [ -n "$args" ] || continue
    if printf '%s\n' "$args" | grep -qxF -- "$want"; then
      printf '%s' "$pid"; return 0
    fi
  done
  return 0
}

find_pid() {
  local dir="$1" pid=""
  # pidfile 优先，但要验一下那个 pid 现在确实还是这个 jar（pid 会被复用）
  if [ -f "$dir/techspace.pid" ]; then
    pid="$(cat "$dir/techspace.pid" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      if tr '\0' '\n' 2>/dev/null < "/proc/$pid/cmdline" | grep -qxF -- "$dir/$CURRENT_DIR_NAME"; then
        printf '%s' "$pid"; return 0
      fi
    fi
  fi
  scan_pid "$dir/$CURRENT_DIR_NAME"
}

# 结果靠这两个全局变量带出去，**不要用 echo 让调用方 $(...) 接**。
#
# 这里踩过一个大坑，值得写下来：bash 的命令替换会另开一条管道，而那个子 shell 要等
# 它启动的后台进程退出之后才会关掉管道的写端。可 start_instance 启动的进程恰恰是要
# **一直活着**的 —— 于是子 shell 永远不退出，远端 bash 永远卡在 read 上，ssh 那头
# 表现成"命令不返回"。是部署脚本，卡住比报错难查得多。
START_RESULT=""
STOP_RESULT=""

# 停旧进程。TERM 先行（让 Spring 的 shutdown hook 收尾），超时才 KILL。
stop_instance() {
  local dir="$1" pid
  pid="$(find_pid "$dir")"
  if [ -z "$pid" ]; then
    STOP_RESULT=NONE
    return 0
  fi
  kill -TERM "$pid" 2>/dev/null || true
  local i
  for i in $(seq 1 "$2"); do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$dir/techspace.pid"
      STOP_RESULT=STOPPED
      return 0
    fi
    sleep 1
  done
  kill -KILL "$pid" 2>/dev/null || true
  sleep 2
  rm -f "$dir/techspace.pid"
  STOP_RESULT=KILLED
}

# 启动。stdin 接 /dev/null、stdout/stderr 都进日志文件 —— 不重定向的话 ssh 会一直
# 等着这个 fd 关闭，命令不返回。setsid 再兜一层：让进程脱离 ssh 的会话，
# 断开连接时不会收到 HUP（nohup 只挡 HUP，setsid 顺带把会话也换了）。
start_instance() {
  local dir="$1" profile="$2" env_file="$3" log_mb="$4"
  # ★ 这里是 console.log 不是 backend.log，**不能改回去**。应用自己用 Log4j2 写
  #   logs/backend.log（log4j2-spring.xml 的 RollingFile appender），而 nohup 这个
  #   重定向是第二个写入方。两个后果：
  #     1) 两边的行会交错着往同一个文件里写，谁也说不清一行是谁打的；
  #     2) 更致命的是下面按大小轮转用的 mv —— Log4j2 手里开着旧的 fd，mv 之后它会
  #        继续往"已经改了名的那个 inode"里写，新出现空文件永远不长。现象是
  #        "发布一次之后 backend.log 就再也不更新了"，而且不报任何错。
  #   各写各的，并且各轮转各的：backend.log 由 Log4j2 自己按天/按大小滚，
  #   console.log 由下面这段 mv 滚。
  local log="$dir/logs/console.log"
  mkdir -p "$dir/logs"

  if [ -f "$env_file" ]; then
    # set -a：让文件里的赋值自动 export，不用在 env 文件里逐个写 export
    set -a; . "$env_file"; set +a
  else
    echo "ENV_MISSING" >&2
  fi

  if [ -f "$log" ] && [ "$(stat -c %s "$log" 2>/dev/null || echo 0)" -gt $((log_mb * 1024 * 1024)) ]; then
    mv -f "$log" "$log.1"
    echo "LOG_ROTATED" >&2
  fi

  # 启动前的行数，就绪判定只认这之后新增的行，否则上一次启动留下的旧行会让它立刻通过。
  # 必须显式判存在：写 `wc -l < "$log" 2>/dev/null` 是不行的 —— 输入重定向在命令执行
  # **之前**由 shell 处理，文件不存在时 shell 自己就报错了，那个 2>/dev/null 属于 wc、
  # 根本管不到它（不会中断，但会在**全新部署**时打一行 No such file or directory，
  # 看起来像出错了）。新装的机器上 logs/ 里一个文件都没有，正好撞上。
  local before=0
  if [ -f "$log" ]; then
    before="$(wc -l < "$log")"
  fi

  # 直接在本脚本里 cd，不用 ( cd ... & ) 包一层：包一层会多一个子 shell，
  # 而那个子 shell 的 stdout 就是调用方的管道 —— 又一个会被后台进程拖住的东西。
  # java 的 0/1/2 全都重定向走了，不会占着任何管道，这也是 ssh 能正常返回的前提。
  cd "$dir" || { START_RESULT=CD_FAILED; return 0; }
  # ★ 用全路径，不用裸 `java`：非交互 shell 的 PATH 上未必是能跑这个 jar 的那个
  #   （这台机器上就是 Java 8）。见 RUNTIME_JAVA 和 prepare 里的说明。
  setsid nohup "$RUNTIME_JAVA" -jar "$dir/$CURRENT_DIR_NAME" \
    --spring.profiles.active="$profile" \
    >> "$log" 2>&1 < /dev/null &

  # pid 权威来源是扫 /proc 而不是 $!：setsid 在某些情况下会先 fork 一下，
  # 那样 $! 拿到的是 setsid 自己的 pid，不是 java 的。
  # 这里同样不能用 pgrep -f（见 scan_pid 上面那段），启动瞬间它可能返回调用方的 pid，
  # 于是 pidfile 里存了个活着的错 pid —— 下面的存活检查和就绪判定全都会误判。
  local pid="" i
  for i in $(seq 1 15); do
    pid="$(scan_pid "$dir/$CURRENT_DIR_NAME")"
    [ -n "$pid" ] && break
    sleep 1
  done
  if [ -z "$pid" ]; then
    START_RESULT=NOPID
    return 0
  fi
  echo "$pid" > "$dir/techspace.pid"

  # 就绪判定：等日志里出现 "Started TechSpaceApplication"。只看新写入的那些行
  # （before 是启动前的行数），否则上一次启动的旧行会让它立刻"通过"。
  # 盯的是 $log 也就是 console.log：Log4j2 的 Console appender 写的就是 stdout，
  # 正好落到这个文件里，所以这句话在两个地方都有 —— 这里和 backend.log 里。
  # 顺带这也是前面坚持留一份 Console appender 的原因：日志系统初始化**之前**的输出
  # （JVM 起不来、banner、启动早期的报错）只在这里。
  for i in $(seq 1 "$START_WAIT"); do
    if tail -n +$((before + 1)) "$log" 2>/dev/null | grep -qE "Started TechSpaceApplication|APPLICATION FAILED TO START"; then
      break
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      START_RESULT=DIED
      tail -n 40 "$log" >&2
      return 0
    fi
    sleep 1
  done

  if tail -n +$((before + 1)) "$log" 2>/dev/null | grep -q "APPLICATION FAILED TO START"; then
    START_RESULT=FAILED
    tail -n 40 "$log" >&2
    return 0
  fi
  if ! tail -n +$((before + 1)) "$log" 2>/dev/null | grep -q "Started TechSpaceApplication"; then
    START_RESULT=TIMEOUT
    tail -n 40 "$log" >&2
    return 0
  fi

  # 日志说起来了，再核一遍端口真的在听
  for i in $(seq 1 5); do
    remote_port_open "$5" && break
    sleep 1
  done
  START_RESULT=STARTED
}

ACTION="$1"

# ---------- prepare：确定目录、建目录、检查远端环境 ----------
if [ "$ACTION" = prepare ]; then
  DIR="$2"
  # ${3:-} 的写法是必须的：本地没有指定 REMOTE_JAVA 时这个参数是**空串**，而 ssh 是把
  # 参数用空格拼成一条命令发过来的，空参数会被吃掉 —— 远端这里 $3 就成了未设置，
  # 在 set -u 下直接引用 "$3" 会以 unbound variable 退出（不是"当空处理"）。
  WANT_JAVA="${3:-}"
  # 远端已经有实例在跑时，沿用它的目录 —— 已部署过的机器就不用再改配置了。
  # 扫 /proc/*/cmdline，取**完整的一个参数**形如 /path/to/tech-space*.jar 的那个。
  # 原来这里是 pgrep -af 'tech-space[^ ]*\.jar' 加一句 grep -oE '/[^ ]*/tech-space[^ ]*\.jar'，
  # 两个毛病：
  #   · pgrep 是子串匹配，谁的命令行里带这个串就算谁（见 scan_pid 上面那段）；
  #   · grep -oE 的模式右端**没锚**，`/opt/spring_apps/tech-space.jar.new` 会被截成
  #     `/opt/spring_apps/tech-space.jar` 匹配上。后果不是"找不到"而是"找错"：
  #     DIR 会从一个当时并不在运行的文件上推出来，然后往那个目录里部署。
  # 这里要的是"正在运行"的实例，所以只认完整的参数。
  running_jar=""
  for _p in /proc/[0-9]*; do
    _args="$(tr '\0' '\n' 2>/dev/null < "$_p/cmdline" || true)"
    [ -n "$_args" ] || continue
    running_jar="$(printf '%s\n' "$_args" | grep -xE '/.*/tech-space[^/]*\.jar' | head -1 || true)"
    [ -n "$running_jar" ] && break
  done
  if [ -n "$running_jar" ]; then
    DIR="$(dirname "$running_jar")"
  fi

  mkdir -p "$DIR/logs"
  [ -w "$DIR" ] || { echo "DIR_NOT_WRITABLE=$DIR" >&2; exit 1; }

  # ── 挑一个能跑这个 jar 的 java ────────────────────────────────────────────
  #
  # 不能只认 PATH 上的 `java`：ssh 跑的是**非交互** shell，PATH 是 sshd 的默认值，
  # 而人手敲命令时那个 PATH 常常被 /etc/profile、~/.bashrc 或 sdkman 提前了某个 java
  # —— 同一个 `java` 在两个环境里可以是两个版本。这台机器正是如此：系统 java 是 8，
  # JDK 17 在 /usr/java/jdk-17.0.10，只在交互式环境里可见。
  #
  # 后果不是"起不来"这么轻：原来的检查只 echo 一行 JAVA_WARN 就放行，于是流程一路走到
  # 停旧进程 → 换 jar → 才由 JVM 报 UnsupportedClassVersionError（class 61 需要 17，
  # 系统 java 只认到 52）→ 触发回滚，而**回滚用的还是同一个错 java**，站点被留在
  # "旧进程已停、新实例起不来"的空档里。所以这里是**硬失败**：必须在动任何东西之前
  # 就停手，而且它发生在本地 Maven 构建之前（见本地脚本里 prepare 与 build 的先后），
  # 连构建都省了。
  #
  # 候选顺序：显式指定（本地 REMOTE_JAVA）→ PATH 上的 → 常见安装目录。
  # 这台机器的 /usr/java/jdk-17.0.10 走的就是第三条。
  _cands=()
  [ -n "$WANT_JAVA" ] && _cands+=("$WANT_JAVA")
  _cands+=(java)
  for _d in /usr/java/*/bin/java /usr/lib/jvm/*/bin/java /usr/local/*/bin/java \
            /opt/*/bin/java /opt/*/*/bin/java "$HOME"/.sdkman/candidates/java/*/bin/java; do
    [ -x "$_d" ] && _cands+=("$_d")
  done

  CHOSEN=""; CHOSEN_MAJOR=""; TRIED=""
  for _c in "${_cands[@]}"; do
    if [ "$_c" = "java" ]; then
      _path="$(command -v java 2>/dev/null || true)"
      [ -n "$_path" ] || continue
    else
      _path="$_c"
      [ -x "$_path" ] || continue
    fi
    _m="$(java_major_of "$_path" || true)"
    [ -n "$_m" ] || continue
    TRIED="${TRIED}${_path}(java${_m}) "
    # >= 17：jar 是 class 61，17 及以上的 JVM 都能跑（21 也行）
    if [ "$_m" -ge 17 ] 2>/dev/null; then
      CHOSEN="$_path"; CHOSEN_MAJOR="$_m"; break
    fi
  done

  if [ -z "$CHOSEN" ]; then
    echo "远端没有主版本 >= 17 的 java，而这个 jar 需要 17（Spring Boot 3 的最低要求）。" >&2
    echo "  试过的候选：${TRIED:-（一个都没找到）}" >&2
    echo "  装一个 JDK 17，或者显式指定路径：" >&2
    echo "    REMOTE_JAVA=/usr/java/jdk-17.0.10/bin/java ./update.sh" >&2
    exit 1
  fi

  echo "JAVA_MAJOR=$CHOSEN_MAJOR"
  [ "$CHOSEN_MAJOR" = "17" ] || echo "JAVA_WARN=$CHOSEN_MAJOR" >&2

  # stdout 上给本地解析的两行（JAVA 最后一行留给 DIR）—— 其余都走 stderr。
  # 本地拿到 JAVA 后再作为参数传给 deploy/rollback，保证三个动作用的是同一个 java。
  echo "JAVA=$CHOSEN"

  # 只在 stdout 留最后这一行给本地解析，其余都走 stderr
  echo "DIR=$DIR"
  exit 0
fi

# ---------- rollback：把 .prev 换回来 ----------
if [ "$ACTION" = rollback ]; then
  DIR="$2"; PROFILE="$3"; ENV_FILE="$4"; LOG_MAX="$5"; PORT="$6"
  RUNTIME_JAVA="${7:-}"
  # 必须在 stop_instance **之前**断言 —— 否则会先停掉旧进程才发现拿不到 java，
  # 把站点留在空档里（这次的故障就是这么发生的）。
  [ -n "$RUNTIME_JAVA" ] || { echo "NO_JAVA_ARG"; exit 1; }
  if [ ! -f "$DIR/$CURRENT_DIR_NAME.prev" ]; then
    echo "NO_PREV"; exit 1
  fi
  stop_instance "$DIR" "$STOP_WAIT"
  echo "STOP=$STOP_RESULT" >&2
  # 把当前这份留个名字再换回来，别直接丢掉 —— 回滚本身也可能是错的
  mv -f "$DIR/$CURRENT_DIR_NAME" "$DIR/$CURRENT_DIR_NAME.rollback-$(date +%Y%m%d%H%M%S)"
  mv -f "$DIR/$CURRENT_DIR_NAME.prev" "$DIR/$CURRENT_DIR_NAME"
  start_instance "$DIR" "$PROFILE" "$ENV_FILE" "$LOG_MAX" "$PORT"
  if [ "$START_RESULT" != "STARTED" ]; then
    echo "START_FAILED=$START_RESULT" >&2
    exit 1
  fi
  echo "START=$START_RESULT"
  echo "OK"
  exit 0
fi

# ---------- deploy：校验 → 停 → 换 → 起 ----------
if [ "$ACTION" = deploy ]; then
  DIR="$2"; WANT_SHA="$3"; PROFILE="$4"; ENV_FILE="$5"; LOG_MAX="$6"; PORT="$7"
  # $8 是 GIT_DESC（写进 DEPLOYED.txt），$9 是 prepare 探测出来的 java 全路径
  RUNTIME_JAVA="${9:-}"
  NEW="$DIR/$CURRENT_DIR_NAME.new"

  if [ ! -f "$NEW" ]; then
    echo "NO_NEW"; exit 1
  fi
  # scp 中断会留个截断的文件，长度对但内容是半截的也可能。哈希是唯一可靠的确认。
  GOT_SHA="$(sha256sum "$NEW" | awk '{print $1}')"
  if [ "$GOT_SHA" != "$WANT_SHA" ]; then
    rm -f "$NEW"
    echo "SHA_MISMATCH got=$GOT_SHA want=$WANT_SHA"
    exit 1
  fi

  # 必须在 stop_instance **之前**断言 —— 否则会先停掉旧进程才发现拿不到 java，
  # 把站点留在空档里（这次的故障就是这么发生的）。
  [ -n "$RUNTIME_JAVA" ] || { echo "NO_JAVA_ARG"; exit 1; }

  stop_instance "$DIR" "$STOP_WAIT"
  echo "STOP=$STOP_RESULT"

  # 停完端口还占着，说明这个端口上是**别人的**进程（pidfile 丢了、或者手起的、
  # 或者根本不是这个服务）。这时候硬起只会撞端口然后静默死掉，不如就地停手。
  if remote_port_open "$PORT"; then
    echo "PORT_BUSY=$PORT"
    exit 1
  fi

  if [ -f "$DIR/$CURRENT_DIR_NAME" ]; then
    cp -f "$DIR/$CURRENT_DIR_NAME" "$DIR/$CURRENT_DIR_NAME.prev"
  fi
  mv -f "$NEW" "$DIR/$CURRENT_DIR_NAME"
  chmod 644 "$DIR/$CURRENT_DIR_NAME"

  START_RESULT=""
  start_instance "$DIR" "$PROFILE" "$ENV_FILE" "$LOG_MAX" "$PORT"

  if [ "$START_RESULT" != "STARTED" ]; then
    # 没起来就把上一版换回去，别把站点留在"旧进程已停、新进程没起"的空档里
    if [ -f "$DIR/$CURRENT_DIR_NAME.prev" ]; then
      echo "START_FAILED=$START_RESULT" >&2
      echo "回滚中…" >&2
      mv -f "$DIR/$CURRENT_DIR_NAME" "$DIR/$CURRENT_DIR_NAME.failed-$(date +%Y%m%d%H%M%S)"
      mv -f "$DIR/$CURRENT_DIR_NAME.prev" "$DIR/$CURRENT_DIR_NAME"
      start_instance "$DIR" "$PROFILE" "$ENV_FILE" "$LOG_MAX" "$PORT"
      echo "ROLLED_BACK（回滚后 $START_RESULT）" >&2
    fi
    exit 1
  fi

  {
    echo "deployed_at=$(date -Is)"
    echo "git=$(printf '%s' "$8")"
    echo "jar_sha256=$WANT_SHA"
    echo "profile=$PROFILE"
  } > "$DIR/DEPLOYED.txt"

  echo "START=$START_RESULT"
  echo "OK"
  exit 0
fi

echo "UNKNOWN_ACTION=$ACTION" >&2
exit 1
REMOTE_SCRIPT
}

# ---------- 本地前置检查 ----------

[ "$ROLLBACK" = 1 ] || [ -f "$SCRIPT_DIR/mvnw" ] || fail "找不到 $SCRIPT_DIR/mvnw，请在 backend 目录下运行"
command -v ssh >/dev/null 2>&1 || fail "找不到 ssh"
command -v scp >/dev/null 2>&1 || fail "找不到 scp"

# prod 的 TLS 证书走 classpath:（application-prod.properties:41），也就是必须被打进 jar。
# 而它被 .gitignore 忽略了（*.pfx），新克隆的仓库里根本没有这个文件 ——
# 构建照样成功，直到远端启动时才报找不到 keystore。所以在这里挡下来。
PFX="$SCRIPT_DIR/src/main/resources/inforetrieval.com.cn.pfx"
if [ "$ROLLBACK" = 0 ] && [ ! -f "$PFX" ]; then
  fail "缺少 TLS 证书 $PFX
${DIM}       它被 .gitignore 忽略了（*.pfx），不会随仓库分发，需要从别处取回。
       没有它 prod profile 起不来（classpath 里找不到 keystore）。${RST}"
fi

if [ "$ROLLBACK" = 0 ] && [ "$SKIP_TESTS" = 0 ]; then
  # TechSpaceApplicationTests.contextLoads 是裸的 @SpringBootTest，会加载 dev profile
  # 并真连 MongoDB（ArticleService 的 @PostConstruct 启动即查库）。连不上要干等 30 秒
  # 才失败，与其让人对着超时堆栈猜，不如在这里提前说清楚。
  if ! port_open 27017; then
    fail "27017 上没有 MongoDB，而打包会跑测试，测试要连库（会干等 30 秒后失败）。
${DIM}       先 ./dev.sh --deps 起依赖，或用 ./update.sh --skip-tests 显式跳过测试。${RST}"
  fi
  port_open 6379 || warn "6379 上没有 Redis；session 相关的测试可能会失败"
fi

# ---------- 远端准备 ----------

info "远端：${REMOTE_USER}@${REMOTE_HOST}:${SSH_PORT}"

# 先单独建连接 —— 密码问在这里，主连接也在这里立起来。
#
# ★ 这一句不是多余的。下面的 PREPARE_OUT="$(remote_run prepare ...)" 是**命令替换**，
#   而替换子 shell 要等它启动的后台进程把 stdout 管道的写端关掉才会结束；刚 fork 出来的
#   muxserver 要是还握着那个管道，就得等到 ControlPersist 到期（60 秒）才返回 ——
#   现象是"卡在远端准备那步不动"。（同类的坑本轮在 start_instance 那里踩过一次：
#   命令替换 + 后台进程 = 死等，见那边的注释。）
#   先用普通前台调用把 master 建好，后面所有命令替换都只是复用连接、不新建 master。
#   顺带好处：密码输错、网络不通都在**构建之前**就报错退出，不白等一次 Maven。
info "连接中…${DIM}首次会提示输入 $REMOTE_USER 的密码，之后复用这条连接${RST}"
if ! ssh -p "$SSH_PORT" "${SSH_COMMON[@]}" "$SSH_TARGET" true; then
  warn "登录 $SSH_TARGET 失败，未做任何改动。"
  info "正常情况下这里会先提示输入密码。没提示就直接失败，通常是本机没有交互式终端"
  info "（ssh 从 /dev/tty 读密码，非交互环境读不到）；密码连错 3 次也会落到这里。"
  fail "远端不可达"
fi

PREPARE_OUT="$(remote_run prepare "$REMOTE_DIR" "$REMOTE_JAVA" 2>/tmp/deploy-prepare.err)" || {
  cat /tmp/deploy-prepare.err >&2
  fail "远端准备失败（见上面的输出）"
}
cat /tmp/deploy-prepare.err >&2 || true
rm -f /tmp/deploy-prepare.err

REMOTE_DIR="$(printf '%s\n' "$PREPARE_OUT" | sed -n 's/^DIR=//p' | tail -1)"
[ -n "$REMOTE_DIR" ] || fail "没能确定远端目录（远端返回: $PREPARE_OUT）"
info "远端目录：$REMOTE_DIR"

# 远端探测出来的 java（prepare 保证主版本 >= 17，找不到就在那边直接失败了）。
# 后面 deploy/rollback 都把它当参数传回去，三个动作用的是同一个 —— 见远端 RUNTIME_JAVA。
RUNTIME_JAVA="$(printf '%s\n' "$PREPARE_OUT" | sed -n 's/^JAVA=//p' | tail -1)"
[ -n "$RUNTIME_JAVA" ] || fail "没能确定远端 java 路径（远端返回: $PREPARE_OUT）"
REMOTE_JAVA_MAJOR="$(printf '%s\n' "$PREPARE_OUT" | sed -n 's/^JAVA_MAJOR=//p' | tail -1)"
info "远端 java：$RUNTIME_JAVA ${DIM}(java${REMOTE_JAVA_MAJOR:-?}；检查用的和启动用的是同一个)${RST}"

if [ "$ROLLBACK" = 1 ]; then
  info "回滚中…${DIM}$REMOTE_DIR/$REMOTE_JAR_NAME.prev → $REMOTE_JAR_NAME${RST}"
  remote_run rollback "$REMOTE_DIR" "$PROFILE" "$REMOTE_DIR/backend.env" "$LOG_MAX_MB" "$BACKEND_PORT" \
    "$RUNTIME_JAVA" || fail "回滚失败（见上面的输出）"
  ok "已回滚并重启。"
  exit 0
fi

# ---------- 构建 ----------

# 记下这次发布对应哪份代码。jar 一旦传上去就跟仓库脱钩了，
# 之后回头看 DEPLOYED.txt 至少要能答出"线上跑的是哪个 commit"。
GIT_DESC="$(cd "$SCRIPT_DIR/.." && git rev-parse --short HEAD 2>/dev/null || true)"
[ -n "$GIT_DESC" ] || GIT_DESC="unknown"
if [ -n "$(cd "$SCRIPT_DIR/.." && git status --porcelain 2>/dev/null || true)" ]; then
  GIT_DESC="$GIT_DESC+未提交改动"
  warn "工作区有未提交的改动，这次发布的内容不完全等于 $GIT_DESC"
fi
info "代码版本：$GIT_DESC"

# ── 本地构建用的 JDK ────────────────────────────────────────────────────────
#
# 这条 ./mvnw 用的是**本地环境里的 java**，可能不是 17 —— 而 JDK 23 起 javac 不再
# 自动运行「只出现在 classpath 上」的注解处理器（要显式 -proc:full / --processor-path），
# Lombok 恰恰就是这样挂进来的（pom 里是 <optional> 依赖，没配 annotationProcessorPaths）。
# 于是 @Data 不生成任何 getter/setter，构建以几十条
#     cannot find symbol: method getTitle() / isDeleted() / get_id() ...
# 失败，报错全指向业务代码，而 javac 对此**不打任何警告**。
# 实测：JDK 25 下 59 条错误，JDK 17 下 0 条。
#
# 别指望上面 prepare 挑的那个 java：它管的是**远端运行** jar（>= 17 就行），
# 和这里的编译期要求是两件事。所以本地也钉到 17，找不到就硬失败 —— 理由和上面
# PFX 那段一样：构建期就能确定的事，不要留到远端去报。要换 JDK 用 JAVA_HOME 指过来。
#
# 下面这个函数和 prepare 里远端那份 java_major_of 是同一套写法（不锚行号 ——
# JAVA_TOOL_OPTIONS 会把版本行挤到第 2 行；取前两段 —— Java 8 的 "1.8.0_392"
# 主版本号在第二段）。远端脚本在 heredoc 里，本地用不到它，所以这里留一份。
local_java_major_of() {
  "$1" -version 2>&1 \
    | sed -nE 's/.*version "([0-9]+)(\.([0-9]+))?.*/\1 \3/p' \
    | head -1 | awk '{ print ($1 == 1 && $2 != "") ? $2 : $1 }'
}

LOCAL_JAVA_HOME=""
_jtried=""
for _jh in "${JAVA_HOME:-}" /usr/lib/jvm/* /usr/java/* /usr/local/* /opt/* /opt/*/* \
           "$HOME"/.sdkman/candidates/java/*; do
  [ -n "$_jh" ] && [ -x "$_jh/bin/java" ] || continue
  _jm="$(local_java_major_of "$_jh/bin/java" || true)"
  [ -n "$_jm" ] || continue
  _jtried="${_jtried}${_jh}(java${_jm}) "
  [ "$_jm" = 17 ] && { LOCAL_JAVA_HOME="$_jh"; break; }
done

if [ -z "$LOCAL_JAVA_HOME" ]; then
  fail "本地没有 JDK 17，而这个项目必须用它编译（见本段上面的说明）
${DIM}       试过的候选：${_jtried:-（一个都没找到）}
       装一个 JDK 17，或显式指一个：
         JAVA_HOME=/path/to/jdk-17 ./update.sh${RST}"
fi
[ "$LOCAL_JAVA_HOME" = "${JAVA_HOME:-}" ] \
  || info "本地 JDK：$LOCAL_JAVA_HOME${DIM}（不用环境里那个 java，原因见上面的注释）${RST}"

MVN_ARGS=(clean package)
if [ "$SKIP_TESTS" = 1 ]; then
  MVN_ARGS+=(-DskipTests)
fi

info "构建中…${DIM}./mvnw ${MVN_ARGS[*]}${RST}"
# JAVA_HOME 只给这条 mvnw 带上（临时赋值），不改这个脚本自己的环境 ——
# 下面还有 ssh/scp 要跑，不需要它们看见这个变量。
( cd "$SCRIPT_DIR" && JAVA_HOME="$LOCAL_JAVA_HOME" ./mvnw "${MVN_ARGS[@]}" ) \
  || fail "构建失败，已中止（远端没有被改动）"

# clean 之后 target 下只应有这一个 jar。排除 .original —— spring-boot:repackage 会把
# 未被 repackage 的原件改名为 *.jar.original，名字里同样带 .jar。
JAR="$(find "$SCRIPT_DIR/target" -maxdepth 1 -name '*.jar' ! -name '*.jar.original' | head -1)"
[ -n "$JAR" ] || fail "构建成功但 target 下找不到 jar"
info "产物：$(basename "$JAR") ${DIM}($(du -h "$JAR" | cut -f1))${RST}"

# 打包内容自检。这两个文件缺一个，远端就起不来，而失败点离这里很远：
#   - pfx 缺 → prod profile 找不到 keystore
#   - application-prod.properties 缺 → --spring.profiles.active=prod 没有配置可加载
# unzip 不保证有，退到 jar（JDK 自带，反正上面已经要求 Java 17）
jar_list() {
  if command -v unzip >/dev/null 2>&1; then unzip -Z1 "$1"; else jar tf "$1"; fi
}
ENTRIES="$(jar_list "$JAR")"
printf '%s\n' "$ENTRIES" | grep -q 'BOOT-INF/classes/inforetrieval.com.cn.pfx' \
  || fail "jar 里没有 TLS 证书（BOOT-INF/classes/inforetrieval.com.cn.pfx），prod 起不来"
printf '%s\n' "$ENTRIES" | grep -q 'BOOT-INF/classes/application-prod.properties' \
  || fail "jar 里没有 application-prod.properties"

SHA="$(sha256sum "$JAR" | awk '{print $1}')"
info "jar sha256：${SHA:0:16}…"

# ---------- 上传 ----------

# 上传成 .new，**不动正在跑的那个**（原因见文件头第 1 条）
info "上传中…${DIM}$REMOTE_DIR/$REMOTE_JAR_NAME.new${RST}"
scp -P "$SSH_PORT" "${SSH_COMMON[@]}" "$JAR" "$SSH_TARGET:$REMOTE_DIR/$REMOTE_JAR_NAME.new" \
  || fail "上传失败（远端没有被改动）"

if [ "$NO_START" = 1 ]; then
  ok "已上传到 $REMOTE_DIR/$REMOTE_JAR_NAME.new。--no-start 指定，未重启服务。"
  info "下次不带 --no-start 跑本脚本即可换上它（会重新上传并校验）。"
  exit 0
fi

# ---------- 停止 / 替换 / 启动 ----------

info "切换并重启…${DIM}停旧进程 → 换 jar → nohup 启动 → 等 Started${RST}"
DEPLOY_OUT="$(remote_run deploy "$REMOTE_DIR" "$SHA" "$PROFILE" \
  "$REMOTE_DIR/backend.env" "$LOG_MAX_MB" "$BACKEND_PORT" "$GIT_DESC" "$RUNTIME_JAVA" \
  2>/tmp/deploy-run.err)" || {
  cat /tmp/deploy-run.err >&2
  fail "远端切换失败。上面的 ROLLED_BACK 表示已自动换回上一版，日志尾巴在上面。"
}
cat /tmp/deploy-run.err >&2 || true
rm -f /tmp/deploy-run.err

case "$DEPLOY_OUT" in
  *STOP=KILLED*)  warn "旧进程 TERM 后 ${STOP_WAIT}s 没退出，已 KILL（可能有未落盘的写入）" ;;
  *STOP=NONE*)    info "远端原本没有实例在跑（首次发布？）" ;;
esac

# ---------- 收尾确认 ----------

info "从本地探一次健康端点（走公网域名 + 真实证书，能验证 TLS 这一路是通的）"
if command -v curl >/dev/null 2>&1; then
  if curl -fsS --max-time 10 "$HEALTH_URL"; then
    echo
    ok "发布完成。"
  else
    echo
    warn "本机探 $HEALTH_URL 失败。远端日志里已经出现 Started，所以服务本身大概率是好的 ——
${DIM}       可能是本机到该域名/端口的网络不通。请手工确认：
       curl -sS $HEALTH_URL
       curl -sS https://${REMOTE_HOST}:${BACKEND_PORT}/comment/home/getHomeLikes${RST}"
  fi
else
  warn "本机没有 curl，跳过健康探测。手工确认：curl -sS $HEALTH_URL"
fi

STATUS="$(printf '%s\n' "$DEPLOY_OUT" | grep -E '^(STOP|START)=' | tr '\n' ' ' || true)"
info "远端状态：${STATUS:-（无输出）}"
info "日志：$REMOTE_DIR/logs/backend.log ${DIM}（Log4j2 写的，按天+20MB 滚动、留 30 天）${RST}"
info "      $REMOTE_DIR/logs/console.log ${DIM}（nohup 接的 stdout/stderr，启动失败先看这份）${RST}"
info "回滚：./update.sh --rollback${DIM}（远端留了一份 $REMOTE_JAR_NAME.prev）${RST}"
info "远端 env 文件：$REMOTE_DIR/backend.env ${DIM}（权限 600，放 GITHUB_CLIENT_ID /
       GITHUB_CLIENT_SECRET 等；不存在的话评论区登录按钮不显示，服务本身照常起来）${RST}"
