#!/bin/bash
cd "$(dirname "$0")"

echo "正在停止 REHOT 相关进程..."
for port in 3000 3001 3003 9090; do
  pids=$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null)
  for pid in $pids; do
    cwd=$(lsof -a -p "$pid" -d cwd 2>/dev/null | tail -1 | awk '{print $NF}')
    if echo "$cwd" | grep -qi "REHOT"; then
      echo "结束 PID $pid (端口 $port)"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
done

# 若 3000 仍被本项目的旧 node 占用，强制释放
old_pid=$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | head -1)
if [ -n "$old_pid" ]; then
  cwd=$(lsof -a -p "$old_pid" -d cwd 2>/dev/null | tail -1 | awk '{print $NF}')
  if echo "$cwd" | grep -qi "REHOT"; then
    echo "强制结束旧后端 PID $old_pid (端口 3000)"
    kill -9 "$old_pid" 2>/dev/null || true
  fi
fi

sleep 1
echo "启动 REHOT 开发服务（后端 3003，前端 9090）..."
exec npm run dev
