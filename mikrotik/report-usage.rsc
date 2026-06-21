# ============================================================
# Script MikroTik RouterOS 7.x — Envia consumo para Hotspot Manager
# RB760iGS — RouterOS 7.12.1
#
# Instalar como script e configurar scheduler para chamar a cada 5 min.
# ============================================================
:local apiUrl "https://hotspot-manager-delta.vercel.app/api/mikrotik/usage"
:local apiKey "SUA_MIKROTIK_API_KEY_AQUI"

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
