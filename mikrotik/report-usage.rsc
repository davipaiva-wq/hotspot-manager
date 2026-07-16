# ============================================================
# Script MikroTik RouterOS 7.x — Envia consumo para Hotspot Manager
# RB760iGS — RouterOS 7.12.1
#
# Instalar como script e configurar scheduler para chamar a cada 15s.
# ============================================================
:local apiUrl "https://hotspot-manager-delta.vercel.app/api/mikrotik/usage"
:local apiKey "SUA_MIKROTIK_API_KEY_AQUI"

:local jsonBody "{\"sessions\":["
:local first true

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

:local headers ({"Content-Type: application/json"; ("x-api-key: " . $apiKey)})

:local response ""
:do {
  :local result [/tool fetch \
    url=$apiUrl \
    http-method=post \
    http-header-field=$headers \
    http-data=$jsonBody \
    output=user \
    as-value]
  :set response ($result->"data")
} on-error={ :log warning "hotspot-manager: falha ao enviar consumo" }

:if ($response = "") do={ :return }

# Processa resposta: desconecta usuários bloqueados e aplica limite de velocidade
:foreach i in=[/ip hotspot active find] do={
  :local mac     [/ip hotspot active get $i mac-address]
  :local address [/ip hotspot active get $i address]

  # Localiza este MAC na resposta e extrai o segmento JSON do objeto
  :local macPos [:find $response $mac]
  :if ($macPos != "") do={
    :local nextBrace [:find $response "}" $macPos]
    :local segment [:pick $response $macPos $nextBrace]

    # Desconecta se status=disconnect
    :if ([:find $segment "disconnect"] != "") do={
      /ip hotspot active remove $i
      /queue simple remove [find where target=($address . "/32")] on-error={}
    } else={
      # Aplica limite de velocidade (rateLimit ex: "10M/7M" ou "50M/10M")
      :local rlKey "rateLimit\":\""
      :local rlPos [:find $segment $rlKey]
      :if ($rlPos != "") do={
        :local rlStart ($rlPos + [:len $rlKey])
        :local rlEnd [:find $segment "\"" $rlStart]
        :local rateLimit [:pick $segment $rlStart $rlEnd]

        :if ([/queue simple find where target=($address . "/32")] = "") do={
          /queue simple add name=$address target=($address . "/32") max-limit=$rateLimit comment="hsp-auto"
        } else={
          /queue simple set [find where target=($address . "/32")] max-limit=$rateLimit
        }
      }
    }
  }
}
