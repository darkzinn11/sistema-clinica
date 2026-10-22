#!/usr/bin/env bash
# Publica a API pelo Caddy do VPS (HTTPS automático). Rode DEPOIS de criar o registro DNS "sistema-api.sitw.tech" -> 187.127.53.226.
# Faz backup do Caddyfile, acrescenta o bloco de ops/Caddyfile.sistema-api, valida e só então recarrega (reload é sem queda).
# Se a validação falhar, restaura o Caddyfile e não recarrega. Não altera nenhum outro site.
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="${DEPLOY_HOST:-sitw-tech-vps}"
NAME="sistema-api.sitw.tech"
IP="$(ssh -o BatchMode=yes "$HOST" 'curl -s -4 ifconfig.me')"
RESOLVED="$(dig +short "$NAME" | head -1)"
if [ "$RESOLVED" != "$IP" ]; then echo "O DNS de $NAME ainda não aponta para $IP (resolve para: '${RESOLVED:-nada}'). Crie o registro A e tente de novo." >&2; exit 1; fi
scp -q -o BatchMode=yes ops/Caddyfile.sistema-api "$HOST:/tmp/Caddyfile.sistema-api"
ssh -o BatchMode=yes "$HOST" 'set -e
  CF=/etc/caddy/Caddyfile
  if sudo grep -q "^sistema-api.sitw.tech" $CF; then echo "bloco já existe no Caddyfile; nada a fazer"; rm -f /tmp/Caddyfile.sistema-api; exit 0; fi
  sudo cp -p $CF $CF.bak-$(date +%Y%m%d-%H%M%S)-sistema-api
  { echo; sudo cat /tmp/Caddyfile.sistema-api; } | sudo tee -a $CF >/dev/null
  rm -f /tmp/Caddyfile.sistema-api
  if ! sudo caddy validate --config $CF --adapter caddyfile >/tmp/_caddy_validate.log 2>&1; then
    echo "Caddyfile inválido, restaurando o backup:" >&2; tail -5 /tmp/_caddy_validate.log >&2
    sudo cp -p $(ls -t $CF.bak-*-sistema-api | head -1) $CF; exit 1
  fi
  sudo systemctl reload caddy && echo "Caddy recarregado"'
echo "Aguardando o certificado (até 90 s)..."
for i in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://$NAME/actuator/health" || true)"
  [ "$code" = "200" ] && { echo "https://$NAME/actuator/health -> 200"; exit 0; }
  sleep 3
done
echo "Ainda sem resposta 200 (último código: $code). Veja: ssh $HOST 'sudo journalctl -u caddy -n 50'" >&2; exit 1
