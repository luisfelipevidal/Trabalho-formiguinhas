const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do Banco de Dados
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'pdv_formiga'
});

// ==========================================
// MÓDULO DE GESTÃO DE ESTOQUE (CRUD)
// ==========================================

// Listar Produtos
app.get('/produtos', async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.nome, p.descricao, p.preco, p.quantidade_estoque, p.imagem, p.badge, c.nome AS category
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.ativo = TRUE
      ORDER BY p.id ASC;
    `;
    const { rows } = await pool.query(query);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao procurar produtos.', detalhe: error.message });
  }
});

// Criar Produto (Com validações de entrada)
app.post('/produtos', async (req, res) => {
  const { categoria_id, nome, descricao, preco, quantidade_estoque, imagem, badge } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'O nome do produto é obrigatório.' });
  }
  if (preco === undefined || preco < 0) {
    return res.status(400).json({ erro: 'O preço não pode ser negativo.' });
  }
  if (quantidade_estoque === undefined || quantidade_estoque < 0) {
    return res.status(400).json({ erro: 'A quantidade em estoque não pode ser negativa.' });
  }

  try {
    const query = `
      INSERT INTO produtos (categoria_id, nome, descricao, preco, quantidade_estoque, imagem, badge)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const values = [categoria_id, nome.trim(), descricao, preco, quantidade_estoque, imagem, badge];
    const { rows } = await pool.query(query, values);
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao cadastrar produto.', detalhe: error.message });
  }
});

// Atualizar Produto
app.put('/produtos/:id', async (req, res) => {
  const { id } = req.params;
  const { categoria_id, nome, descricao, preco, quantidade_estoque, imagem, badge } = req.body;

  try {
    const query = `
      UPDATE produtos 
      SET categoria_id = $1, nome = $2, descricao = $3, preco = $4, quantidade_estoque = $5, imagem = $6, badge = $7
      WHERE id = $8 AND ativo = TRUE RETURNING *;
    `;
    const values = [categoria_id, nome, descricao, preco, quantidade_estoque, imagem, badge, id];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) return res.status(404).json({ erro: 'Produto não encontrado.' });
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao atualizar produto.' });
  }
});

// Inativação Lógica de Produto
app.delete('/produtos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('UPDATE produtos SET ativo = FALSE WHERE id = $1 RETURNING *;', [id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Produto não encontrado.' });
    return res.json({ mensagem: 'Produto inativado com sucesso.' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao inativar produto.' });
  }
});

// ==========================================
// LÓGICA COMERCIAL DE VENDAS (PDV)
// ==========================================

app.post('/vendas', async (req, res) => {
  const { operador, forma_pagamento, itens } = req.body;

  if (!operador || !forma_pagamento || !itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Dados incompletos para efetuar a venda.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Início da transação ACID

    let valorTotalVenda = 0;
    const itensProcessados = [];

    // 1. Validação de Stock e Cálculo do Total
    for (const item of itens) {
      const { produto_id, quantidade } = item;

      const resProd = await client.query(
        'SELECT id, nome, preco, quantidade_estoque, ativo FROM produtos WHERE id = $1 FOR UPDATE;',
        [produto_id]
      );

      if (resProd.rows.length === 0 || !resProd.rows[0].ativo) {
        throw new Error(`Produto ID ${produto_id} não encontrado ou inativo.`);
      }

      const produto = resProd.rows[0];

      // Regra de Restrição Operacional: Bloqueio por stock insuficiente
      if (quantidade > produto.quantidade_estoque) {
        throw new Error(
          `Stock insuficiente para o produto "${produto.nome}". Disponível: ${produto.quantidade_estoque}, Solicitado: ${quantidade}.`
        );
      }

      const precoUnitario = parseFloat(produto.preco);
      const subtotal = precoUnitario * quantidade;
      valorTotalVenda += subtotal;

      itensProcessados.push({
        produto_id,
        quantidade,
        precoUnitario,
        subtotal,
        novoEstoque: produto.quantidade_estoque - quantidade
      });
    }

    // 2. Gravação do Cabeçalho da Venda
    const resVenda = await client.query(
      `INSERT INTO vendas (operador, forma_pagamento, valor_total) 
       VALUES ($1, $2, $3) RETURNING id, data_hora;`,
      [operador, forma_pagamento, valorTotalVenda]
    );

    const vendaId = resVenda.rows[0].id;

    // 3. Registo dos Itens e Baixa Automática de Stock
    for (const item of itensProcessados) {
      await client.query(
        `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5);`,
        [vendaId, item.produto_id, item.quantidade, item.precoUnitario, item.subtotal]
      );

      await client.query(
        `UPDATE produtos SET quantidade_estoque = $1 WHERE id = $2;`,
        [item.novoEstoque, item.produto_id]
      );
    }

    await client.query('COMMIT'); // Confirmação final

    return res.status(201).json({
      mensagem: 'Venda realizada com sucesso!',
      venda: {
        id: vendaId,
        data_hora: resVenda.rows[0].data_hora,
        operador,
        forma_pagamento,
        valor_total: valorTotalVenda,
        itens: itensProcessados
      }
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Reverte alterações caso ocorra erro
    return res.status(400).json({ erro: 'Falha ao processar a venda.', detalhe: error.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
