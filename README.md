# Suíte app's

Aplicação de produtividade com planilhas, documentos, SQL, editor de código, desenho e assistente IA.

## Configuração de contas e dados isolados

1. Crie um projeto Supabase e aplique `supabase/migrations/202611050001_user_data.sql` no SQL Editor.
2. Em Authentication, configure a URL pública da aplicação e habilite confirmação por e-mail conforme necessário.
3. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` localmente e na Vercel.
4. O app armazena os dados por ID autenticado. A tabela usa RLS para que cada conta só leia e altere as próprias linhas.

## Ativar a IA

Crie uma chave no Google AI Studio e salve como `GOOGLE_AI_API_KEY` nas variáveis de ambiente da Vercel. Essa chave só é lida pela função `/api/ai`, nunca pelo navegador. A IA atende perguntas e consegue criar documentos no editor e planilhas no módulo de planilhas. O editor de documentos exporta Word (.docx), HTML, texto e PDF via impressão.

O usuário vê um aviso de privacidade e precisa concordar antes do primeiro pedido. No plano gratuito do Gemini, prompts e respostas podem ser usados pelo Google para melhorar produtos. Consulte os termos e limites atuais do provedor antes de disponibilizar o recurso a outras pessoas.

## Desenvolvimento

```sh
npm install
npm run dev
```

O endpoint `/api/ai` é executado como função Vercel; para testar a IA localmente, use `vercel dev` com as três variáveis configuradas.
