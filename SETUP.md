# Hotspot Manager — Guia de Setup
> Testado: MikroTik RB760iGS · RouterOS 7.12.1

## 1. Banco de dados (Neon)

1. Crie uma conta em https://neon.tech (gratuito)
2. Crie um novo projeto
3. Copie a **Connection string** (começa com `postgresql://...`)

## 2. Deploy na Vercel

1. Faça push deste projeto para um repositório GitHub
2. Acesse https://vercel.com → New Project → importe o repositório
3. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | String de conexão do Neon |
| `AUTH_SECRET` | String aleatória longa (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL do seu app (ex: `https://hotspot.vercel.app`) |
| `MIKROTIK_API_KEY` | Chave secreta compartilhada com o MikroTik |
| `SETUP_SECRET` | Chave para criar o admin inicial |

4. Clique em **Deploy**

## 3. Criar schema e admin no banco

Após o deploy, crie as tabelas e o primeiro admin:

```bash
# Com .env.local configurado localmente:
npm run db:push

# OU direto pela URL do Vercel (substitua os valores):
curl -X POST https://SEU-APP.vercel.app/api/admin/seed \
  -H "x-setup-secret: SUA_SETUP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SuaSenhaForte123"}'
```

## 4. Configurar MikroTik RB760iGS (RouterOS 7.x)

### 4a. Walled Garden — liberar Vercel antes do login

No terminal Winbox ou SSH:
```
/ip hotspot walled-garden add dst-host="SEU-APP.vercel.app" action=allow comment="Hotspot Manager"
```

> Sem isso, o MikroTik bloqueia o acesso ao Vercel antes do usuário autenticar.

### 4b. Substituir login.html no MikroTik

No RouterOS 7 a forma correta de usar login externo é modificar o arquivo `login.html` que o MikroTik serve:

1. Abra o **Winbox → Files**
2. Navegue até a pasta **hotspot/**
3. Faça backup do `login.html` original (renomeie para `login.html.bak`)
4. Faça upload do arquivo `mikrotik/login.html` deste projeto
5. **Edite** o arquivo e troque `SEU-APP.vercel.app` pela sua URL real

O arquivo tem apenas um redirect JavaScript que passa os parâmetros do MikroTik para o Vercel.

### 4c. Scheduler de consumo (a cada 5 minutos)

1. Edite `mikrotik/report-usage.rsc`:
   - Troque `SEU-APP.vercel.app` pela sua URL
   - Troque `SUA_CHAVE_AQUI` pelo valor de `MIKROTIK_API_KEY`

2. No terminal do MikroTik, crie o script:
```
/system script add name=hotspot-report source="<cole o conteúdo do .rsc aqui>"
```

3. Crie o scheduler:
```
/system scheduler add \
  name=hotspot-usage-report \
  interval=00:05:00 \
  on-event="/system script run hotspot-report"
```

> **Importante RouterOS 7:** O script usa `.id` interno como session-id (o campo `session-id` não existe mais em v7). Os múltiplos headers HTTP usam a sintaxe de array `{}`.

### 4d. Verificar que está funcionando

No terminal do MikroTik, rode o script manualmente:
```
/system script run hotspot-report
```

Verifique no painel admin do Vercel se os dados chegaram.

## 5. Acessar o painel

| Quem | URL |
|---|---|
| Admin | `https://SEU-APP.vercel.app/login` |
| Usuário | `https://SEU-APP.vercel.app/login` |
| Hotspot (MikroTik redireciona) | `https://SEU-APP.vercel.app/hotspot/login` |

## Fluxo completo

```
1. Usuário conecta no WiFi
2. MikroTik redireciona para hotspot/login.html (interno)
3. login.html redireciona para SEU-APP.vercel.app/hotspot/login
4. Vercel exibe o formulário de login
5. Usuário digita usuário/senha
6. Vercel valida: usuário ativo? quota ok? limite diário ok?
7. Se bloqueado → mostra tela de erro
8. Se liberado → redireciona para URL interna do MikroTik
9. MikroTik autentica e libera o acesso à internet
10. A cada 5 min, MikroTik envia consumo para Vercel via scheduler
11. Vercel atualiza o banco e verifica quotas
```
