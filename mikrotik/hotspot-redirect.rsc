# ============================================================
# Configuração do Hotspot Profile — RouterOS 7.x (RB760iGS 7.12.1)
# Execute UMA VEZ no terminal do MikroTik
#
# No RouterOS 7, a forma correta de usar login externo é:
#   1. Manter os arquivos HTML no MikroTik
#   2. Substituir o login.html por um redirect para o Vercel
#   3. O Vercel valida e redireciona de volta para o MikroTik
# ============================================================

# 1. Ajuste o hotspot profile (substitua "hsprof1" pelo seu perfil)
/ip hotspot profile set [find name="hsprof1"] \
  login-by=http-chap,http-pap \
  http-cookie-lifetime=3d \
  use-radius=no

# 2. Libere o domínio Vercel no Walled Garden (OBRIGATÓRIO)
#    Substitua SEU-APP pelo seu subdomínio Vercel
/ip hotspot walled-garden add \
  dst-host="SEU-APP.vercel.app" \
  action=allow \
  comment="Hotspot Manager - Vercel"

# Libere também o domínio neon para que o Vercel acesse o banco
# (o Vercel acessa o Neon server-side, então isso pode não ser necessário)

# 3. O arquivo login.html precisa ser modificado no MikroTik.
#    Veja o arquivo login.html nesta pasta e faça upload via:
#    Files → hotspot → login.html
#    (ou via FTP/Winbox Files)
