# Formiga Raivosa

Sistema de Gestão de Stock e Frente de Caixa (PDV) para confeitaria.

O que é?

O Formiga Raivosa é um sistema web que permite visualizar o catálogo de brownies e sobremesas, controlar o saldo em stock e registar as vendas diretamente na base de dados em tempo real.

Tecnologias Utilizadas

* HTML, CSS e JavaScript (Interface de Vendas)
* Node.js e Express (Servidor / API)
* Banco de Dados: PostgreSQL (Tabelas: `categorias`, `produtos`, `vendas`, `itens_venda`)

Como testar

1. Importe o ficheiro `schema.sql` no seu PostgreSQL para criar a base de dados e os produtos iniciais.
2. Inicie o servidor executando `node server.js` no terminal.
3. Abra o ficheiro `teste.html` no seu navegador para ver o catálogo e simular uma compra.
