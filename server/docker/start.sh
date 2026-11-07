#!/bin/sh
set -e
PORT="${PORT:-8080}"
export PORT
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
exec apache2-foreground
