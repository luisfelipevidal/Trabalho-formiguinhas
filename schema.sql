SQL
-- Criação das tabelas relacionais no PostgreSQL

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    categoria_id INT REFERENCES categorias(id),
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL CHECK (preco >= 0),
    quantidade_estoque INT NOT NULL CHECK (quantidade_estoque >= 0),
    imagem VARCHAR(500),
    badge VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operador VARCHAR(100) NOT NULL,
    forma_pagamento VARCHAR(50) NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL
);

CREATE TABLE itens_venda (
    id SERIAL PRIMARY KEY,
    venda_id INT REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INT REFERENCES produtos(id),
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- Inserção de dados iniciais compatíveis com a loja Formiga Raivosa
INSERT INTO categorias (nome) VALUES ('brownies'), ('vulcao'), ('blondies'), ('sobremesas');

INSERT INTO produtos (categoria_id, nome, descricao, preco, quantidade_estoque, imagem, badge) VALUES
(1, 'Brownie Tradicional Ninho & Nutella', 'Massa cremosa de chocolate 50% coberta com recheio denso de Ninho e pura Nutella.', 18.90, 25, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80', 'Mais Pedido'),
(2, 'Vulcão de Brigadeiro Belga', 'Brownie vulcânico que transborda ganache de chocolate Callebaut ao cortar.', 24.50, 15, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80', 'Explosão de Recheio'),
(3, 'Blondie de Pistache e Chocolate Branco', 'Brownie claro de baunilha com pedaços de pistache e calda artesanal.', 22.00, 10, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80', 'Gourmet Premium'),
(4, 'Coxinha de Morango com Brigadeiro', 'Morango fresco selecionado envolto em brigadeiro gourmet e granulado nobre.', 16.00, 30, 'https://media.istockphoto.com/id/1739777715/pt/foto/brazilian-sweet-strawberry-coxinha.webp?a=1&b=1&s=612x612&w=0&k=20&c=nsjfvOE6sVv632uc1DSaDZXG0Fww2x5hhM1uCBjmNCc=', 'Sucesso absoluto');
