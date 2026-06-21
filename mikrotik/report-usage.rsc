# ============================================================
# Script MikroTik RouterOS 7.x — Envia consumo para Hotspot Manager
# RB760iGS testado em 7.12.1
#
# Como instalar:
#   /system scheduler add name=hotspot-report interval=00:05:00 \
#     on-event=[/system script get [find name=hotspot-report] source]
#
# Ou cole diretamente no campo on-event do scheduler.
#
# EDITE ESTAS DUAS LINHAS:
:local apiUrl "https://SEU-APP.vercel.app/api/mikrotik/usage"
:local apiKey "SUA_CHAVE_AQUI"
# ============================================================

:local jsonBody "{\"sessions\":["
:local first true

# RouterOS 7: usa .id interno como sessionId (session-id não existe em v7)
:foreach i in=[/ip hotspot active find] do={
  :local user     [/ip hotspot active get $i user]
  :local sessionId [:tostr [/ip hotspot active get $i ".id"]]
  :local address  [/ip hotspot active get $i address]
  :local mac      [/ip hotspot active get $i mac-address]
  :local bytesIn  [/ip hotspot active get $i bytes-in]
  :local bytesOut [/ip hotspot active get $i bytes-out]

  :if (!$first) do={ :set jsonBody ($jsonBody . ",") }
  :set first false

  :set jsonBody ($jsonBody \
    . "{\"username\":\"" . $user \
    . "\",\"sessionId\":\"" . $sessionId \
    . "\",\"ip\":\"" . $address \
    . "\",\"mac\":\"" . $mac \
    . "\",\"bytesIn\":" . $bytesIn \
    . ",\"bytesOut\":" . $bytesOut . "}")
}

:set jsonBody ($jsonBody . "]}")

# RouterOS 7: múltiplos headers usam array {}
:local headers ({"Content-Type: application/json"; ("x-api-key: " . $apiKey)})

/tool fetch \
  url=$apiUrl \
  http-method=post \
  http-header-field=$headers \
  http-data=$jsonBody \
  output=none
