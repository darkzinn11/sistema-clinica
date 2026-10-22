#!/usr/bin/env bash
# Atualiza o backend que roda no VPS (serviço systemd "multisaude-backend"). Uso, a partir de backend/:
#   ./scripts/deploy_vps.sh
# Compila o jar (sem rodar testes: rode-os antes), envia, reinicia e confere o health. Se o health não voltar,
# restaura o jar anterior. Não lê nem envia o .env: as senhas ficam só em /etc/multisaude/backend.env no VPS.
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
HOST="${DEPLOY_HOST:-sitw-tech-vps}"

echo "== compilando"
./mvnw -q -DskipTests package
JAR=$(ls target/backend-*.jar | grep -v original | head -1)

echo "== enviando $JAR"
scp -q -o BatchMode=yes "$JAR" "$HOST:/tmp/multisaude-backend.jar"

echo "== instalando e reiniciando (guarda o jar anterior)"
ssh -o BatchMode=yes "$HOST" 'set -e
  APP=/opt/multisaude-backend
  sudo test -f $APP/multisaude-backend.jar && sudo cp -p $APP/multisaude-backend.jar $APP/multisaude-backend.jar.anterior || true
  sudo install -o multisaude -g multisaude -m 640 /tmp/multisaude-backend.jar $APP/multisaude-backend.jar
  rm -f /tmp/multisaude-backend.jar
  sudo systemctl restart multisaude-backend
  for i in $(seq 1 40); do
    [ "$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8083/actuator/health)" = "200" ] && { echo "health: UP"; exit 0; }
    sleep 3
  done
  echo "health NÃO voltou: restaurando o jar anterior" >&2
  if sudo test -f $APP/multisaude-backend.jar.anterior; then
    sudo cp -p $APP/multisaude-backend.jar.anterior $APP/multisaude-backend.jar && sudo systemctl restart multisaude-backend
  fi
  sudo journalctl -u multisaude-backend --no-pager -n 30 >&2
  exit 1'
