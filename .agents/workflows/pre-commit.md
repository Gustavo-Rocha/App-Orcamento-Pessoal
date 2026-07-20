---
description:  Verifica tipagem, estética, qualidade e build do código antes de commitar alterações
---

## Passos:
1. **Verificação de Sintaxe & Tipagem:** Execute `npm run build` ou `npx tsc --noEmit`. Não ignore erros de tipagem.

2. **Linting & Estilo:** 
   - Execute o Linter no projeto para garantir a qualidade do código.
   - Execute o Prettier no projeto para garantir a estética do código.

3. **Resumo de Alterações:** Identifique se houve adição [I], remoção [R] ou alteração [A] significativa na lógica de negócio.

## Critérios de Aceite
- Zero erros de ESLint.
- Zero erros do Prettier.
- Tipagem TypeScript 100% válida.
- Build do Next.js concluída sem avisos críticos.