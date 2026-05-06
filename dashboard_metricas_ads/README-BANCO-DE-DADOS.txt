SOBRE O BANCO DE DADOS DO SISTEMA

Este projeto roda apenas com HTML, CSS e JavaScript no navegador.
Por segurança, navegadores não permitem que um site local grave automaticamente dentro de um arquivo .json da pasta.

Por isso, o sistema usa duas camadas:

1. localStorage
   - Guarda os dados automaticamente no navegador durante o uso normal.
   - Funciona sem internet e sem servidor.
   - Limitação: os dados ficam naquele navegador/dispositivo.

2. Backup JSON portátil
   - Use o botão "Exportar banco JSON" para baixar um arquivo com tudo que está salvo:
     posts turbinados, campanhas e CRM de leads.
   - Use o botão "Importar banco JSON" em outro navegador/computador para restaurar os dados.
   - O arquivo database.json incluído na pasta é apenas um modelo inicial.

COMO LEVAR OS DADOS COM VOCÊ

1. Abra qualquer página do sistema.
2. Clique em "Exportar banco JSON".
3. Guarde o arquivo baixado junto com a pasta do sistema.
4. Em outro computador/navegador, abra o sistema e clique em "Importar banco JSON".
5. Selecione o backup exportado.

Para um banco gravando automaticamente em arquivo real, seria necessário transformar o projeto em uma aplicação com backend, por exemplo Node.js + SQLite ou Supabase.
