#!/bin/bash

TARGET_DIR="./dist"

# 删除文件夹下的所有文件
rm -rf "$TARGET_DIR"/* &&

npm run build &&

# 配置变量
REMOTE_USER="root"
REMOTE_HOST="inforetrieval.com.cn"
REMOTE_PATH="/var/ssl"
SSH_PORT="22"  

echo "Start deleting front end files in $REMOTE_PATH." &&

# SSH 登录并删除文件
ssh -p $SSH_PORT $REMOTE_USER@$REMOTE_HOST "rm -rf $REMOTE_PATH/*" &&

echo "Files in $REMOTE_PATH have been deleted." &&

echo "Start uploading front end files to $REMOTE_PATH." &&

scp -r -P $SSH_PORT $TARGET_DIR/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH &&

echo "Files in $TARGET_DIR have been scp to $REMOTE_PATH."

# 上面那串 && 的结果。断在 rm/npm build/scp 任一步，这里拿到的就是失败码
# （那串链一旦断掉，后面的命令都不会执行，$? 停在断掉的那条上）。
# 取值必须紧跟在链后面，中间只隔了注释和空行 —— 注释不是命令，不会冲掉 $?。
upload_status=$?

# ============================================================================
# 用本地 nginx.conf 更新远端主配置 /etc/nginx/nginx.conf
#
# 站点文件（上一段 scp 上去的静态文件）**不需要重启 nginx** —— nginx 每个请求
# 都直接读磁盘，换文件立刻生效。原来这里无条件 `systemctl restart nginx` 纯属
# 白发，而且 restart 会把在线连接掐断；现在只有配置文件**真的变了**才
# `nginx -s reload`（平滑：老连接跑完，新连接用新配置，不中断现有请求）。
#
# ★ 顺序是关键：**先校验，后落盘**。
#   写成「先覆盖 /etc/nginx/nginx.conf 再 nginx -t」的话，配置有问题时线上就
#   躺着一份坏配置 —— 而此刻 nginx 还跑着内存里的旧配置，站点看着一切正常，
#   直到下一次重启/重载（甚至机器重启）才会暴露成"nginx 起不来、站点直接挂"。
#   所以这里在 /tmp 上先 `nginx -t -c`，通过了才动线上那个文件。
#
# 失败时的行为：校验没过 -> 线上一个字节都没动，停下来并 exit 1。
#             reload 失败 -> 自动还原时间戳备份再 reload。
# 想跳过这一段：SKIP_NGINX_CONF=1 ./update.sh（临时手动改配置、不带上线时用）。
#
# 注意这一段**不接**在上面那条 && 链后面：带 heredoc 的 ssh 命令后面没法再跟
# `&& echo ...`（heredoc 正文必须紧跟命令，结束标记之后这条命令就结束了），
# 硬接的话那个 echo 会变成独立的一行、远端失败时照样打印成功 —— 实测踩过。
# 所以这里用 if/else 接 ssh 的退出码，并把上面那条链的结果单独接过来。
# ============================================================================

if [ "$upload_status" -ne 0 ]; then
  # 原来那句 restart 是靠 && 链兜住的：静态文件没传上去就不会走到 nginx 那一步。
  # 这段是独立语句，得自己把这个语义补回来 —— 文件都没上去，改 nginx 配置没意义。
  echo "!! 上面的构建/上传没有全部成功，跳过 nginx 配置更新（站点文件仍是旧的）。" >&2
  exit 1
elif [ "${SKIP_NGINX_CONF:-}" = "1" ]; then
  echo "SKIP_NGINX_CONF=1，跳过 nginx 配置更新。"
else

echo "Updating remote nginx config (nginx.conf -> /etc/nginx/nginx.conf)..."

scp -P "$SSH_PORT" nginx.conf "$REMOTE_USER@$REMOTE_HOST:/tmp/nginx.conf.new" \
  || { echo "!! 上传 nginx.conf 失败，远端配置未做任何改动。" >&2; exit 1; }

# 整段远端逻辑塞进**一次** ssh（heredoc + bash -s），而不是拆成
# "校验/备份/落盘/reload" 的好几条命令：这个脚本没有连接复用，
# 每条 ssh 都会单独要一次密码，拆开就是要输四五次。
# 用引号包住的 'REMOTE_SCRIPT' 表示本地**不做**任何变量展开 ——
# 所以远端脚本里不能出现 $SSH_PORT 这类本地变量，全都是远端自己求值的。
# 远端脚本里的 fail / exit 1 会让 ssh 返回非 0，被下面的 if 接住。
if ssh -p "$SSH_PORT" "$REMOTE_USER@$REMOTE_HOST" "bash -s" <<'REMOTE_SCRIPT'
set -u

CONF=/etc/nginx/nginx.conf
NEW=/tmp/nginx.conf.new

fail() { echo "[nginx] $*"; exit 1; }

# 收尾：/tmp 上那份不管走哪条路都不留（/etc 里那个临时文件只有在
# 落盘那一步被中断时才会存在）。
TMP=""
cleanup() {
  rm -f "$NEW"
  if [ -n "$TMP" ]; then rm -f "$TMP"; fi
}
trap cleanup EXIT

[ "$(id -u)" = "0" ] || fail "需要 root 才能写 $CONF（当前 uid=$(id -u)）"
[ -f "$NEW" ] || fail "远端没找到 $NEW —— 上面的 scp 没成功？"
[ -f "$CONF" ] || fail "$CONF 不存在（远端主配置路径和预期不一致？）未做任何改动。"

# ① 没有变化就整段跳过：不备份、不 reload。
#    reload 会重建 worker 进程，配置没变时这么做只是白扰一次线上。
#    注意这里是**逐字节**比较：差一个末尾换行也算"变了"，会白备份+reload 一次。
#    （本地那份 nginx.conf 之前就没有末尾换行，已经补上了 —— 它和线上那份
#    如果本来一致，补完之后就稳定匹配了。）
if cmp -s "$CONF" "$NEW"; then
  echo "[nginx] 配置没有变化，跳过（线上文件未改动，未 reload）。"
  exit 0
fi

# ② 把差异打出来。diff 发现差异时返回 1，这里必须 || true 吃掉 ——
#    否则这行的退出码会成为整段远端脚本的退出码，ssh 跟着返回非 0，
#    本地那个 if 就会把"有差异"误判成"更新失败"。
echo "[nginx] 差异（线上 --- -> 本地 +++）："
diff -u "$CONF" "$NEW" || true

# ③ 先校验。nginx 会连证书文件、日志路径一起检查，所以这一步能挡住
#    "语法对但证书路径写错"这类问题，不只是括号配对。
if ! nginx -t -c "$NEW"; then
  echo "[nginx] 校验没通过：**线上配置未改动**，nginx 仍按旧配置运行。"
  exit 1
fi

# ④ 备份 + 落盘。备份名带时间戳，出事了直接
#    cp /etc/nginx/nginx.conf.bak.<时间戳> /etc/nginx/nginx.conf && nginx -s reload
#    就能手工回退。这里**不自动删旧备份**：一个配置文件才几 KB，
#    留着比"想回退时发现备份被清了"划算；要清自己 rm。
STAMP=$(date +%Y%m%d-%H%M%S)
BAK="$CONF.bak.$STAMP"
cp -p "$CONF" "$BAK" || fail "备份失败，未做任何改动"

# 落在**同一个目录**里再 mv：同文件系统内 rename 是原子的。
# 直接 cp 到 $CONF 的话，写到一半断网/Ctrl-C 会留下一份截断的配置。
TMP="$CONF.tmp.$$"
cp -p "$NEW" "$TMP" || fail "写临时文件失败（线上配置未改动）"
# 本地那份的权限位会跟着 scp 过来（现在它是 755，带着执行位），
# 配置文件的惯例是 644 root:root，这里统一一下。
chmod 644 "$TMP"
chown root:root "$TMP" 2>/dev/null || true
mv "$TMP" "$CONF" || fail "落盘失败（线上配置未改动，备份在 $BAK）"
TMP=""
echo "[nginx] 已落盘。备份：$BAK"

# ⑤ 平滑重载。校验过了还 reload 失败，一般是端口被别的东西占了之类，
#    这种时候磁盘上的配置和 nginx 内存里的已经不一致 —— 还原备份是唯一
#    能让两边重新对上的做法。
if nginx -s reload; then
  echo "[nginx] reload 完成，线上已生效。"
else
  echo "[nginx] reload 失败，正在还原 $BAK"
  if cp -p "$BAK" "$CONF" && nginx -s reload; then
    echo "[nginx] 已还原到改动前的配置，线上未受影响。"
  else
    echo "[nginx] !! 还原后 reload 仍然失败，请手工检查（备份还在 $BAK）"
  fi
  exit 1
fi
REMOTE_SCRIPT
then
  echo "Remote nginx config has been updated."
else
  echo "!! 远端 nginx 配置更新失败，详见上面的 [nginx] 输出。" >&2
  echo "!! 站点仍在按改动前的配置运行（校验没过就不会落盘）。" >&2
  exit 1
fi

fi

