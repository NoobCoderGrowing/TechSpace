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

echo "Restarting nginx on remote server..." &&

# 先测试 nginx 配置
ssh -p $SSH_PORT $REMOTE_USER@$REMOTE_HOST "nginx -t && systemctl restart nginx" &&

echo "Nginx has been restarted successfully."

