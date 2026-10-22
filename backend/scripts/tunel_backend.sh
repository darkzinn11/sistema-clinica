#!/usr/bin/env bash
# Traz o backend do VPS para esta máquina em 127.0.0.1:8083 (é o endereço para onde o Vite aponta), reconectando se cair.
# Não rode junto com um backend local na mesma porta. Deixe aberto num terminal.
HOST="${DEPLOY_HOST:-sitw-tech-vps}"
while true; do
  ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o TCPKeepAlive=yes -o BatchMode=yes \
    -L 127.0.0.1:8083:127.0.0.1:8083 "$HOST"
  echo "[$(date +%T)] túnel do backend caiu, reconectando em 3s" >&2
  sleep 3
done
