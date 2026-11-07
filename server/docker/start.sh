#!/bin/sh
set -e
PORT="${PORT:-8080}"
export PORT
# Exactly one MPM (prefork, required by mod_php) must be enabled.
rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.*
a2enmod mpm_prefork >/dev/null 2>&1 || true
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
exec apache2-foreground
