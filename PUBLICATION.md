# Publicação — Pesquisa Eleitoral ES

Esta versão foi preparada para hospedagem em Cloudflare Workers/Sites com Cloudflare D1.

## Antes de publicar

1. Mantenha o binding D1 com o nome `DB`, conforme `.openai/hosting.json`.
2. Aplique as migrações em `drizzle/` no banco de produção.
3. Execute `npm run install:ci` e depois `npm run build` em um ambiente com acesso ao npm.
4. Publique o artefato gerado pela ferramenta de hospedagem Cloudflare/Sites.
5. Faça um teste real pelo celular: abrir a pesquisa, enviar uma resposta e tentar enviar novamente no mesmo navegador.

## Correções desta versão

- Estatísticas passam a usar contagem total no banco, em vez de considerar apenas as últimas 200 respostas.
- A API continua retornando no máximo 200 registros recentes para evitar respostas HTTP excessivamente grandes.
- Município e candidatura são validados também no servidor.
- As opções de município/candidatura ficam centralizadas em `lib/survey-options.ts` e são compartilhadas pela interface e pela API.
- A inicialização da pesquisa atualizada também ocorre no POST, evitando que a primeira participação seja gravada antes da rotina de reset.
- Cookie de participação continua `HttpOnly`, `Secure`, `SameSite=Lax` e com validade de 1 ano.

## Limitação importante

O bloqueio de uma participação é por cookie/navegador. Ele não é uma autenticação de eleitor e não impede novas participações em outro navegador ou dispositivo.

## Validação local

O ambiente desta sessão não conseguiu concluir `npm ci` porque não houve resolução de DNS para `registry.npmjs.org`. Portanto, o ZIP é uma versão corrigida do código-fonte, mas o build final precisa ser executado em um ambiente com acesso ao registro npm.
