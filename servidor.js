const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const app = express();
app.use(express.json());

// Conecta ao banco (cria o arquivo treinos.db se não existir)
const db = new DatabaseSync('treinos.db');

// Garante que a tabela de treinos existe
db.exec(`
  CREATE TABLE IF NOT EXISTS treinos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    duracao INTEGER NOT NULL
  )
`);

// Função de validação de corpo da requisição
function validarTreino(corpo) {
  if (typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
    return 'O campo nome e obrigatorio e deve ser um texto.';
  }
  if (typeof corpo.duracao !== 'number' || corpo.duracao <= 0) {
    return 'O campo duracao e obrigatorio e deve ser um numero maior que zero.';
  }
  return null;
}

// 7. GET /treinos/total (Declarada antes de /treinos/:id)
app.get('/treinos', (req, res) => {
  const treinos = db.prepare('SELECT * FROM treinos').all();
  res.status(200).json(treinos);
});

// 11. GET /treinos/resumo (Declarada antes de /treinos/:id)
app.get('/treinos/:id', (req, res) => {
  const id = Number(req.params.id);
  const treino = db.prepare('SELECT * FROM treinos WHERE id = ?').get(id);
  if (treino === undefined) {
    return res.status(404).json({ erro: 'Treino nao encontrado.' });
  }
  res.status(200).json(treino);
});

// READ (Listar todos com Filtro, Ordenação e Busca por Nome - Ex 8, 9, 10)
app.get('/treinos', (req, res) => {
  const { minimo, busca } = req.query;
  let sql = 'SELECT * FROM treinos WHERE 1=1';
  const params = [];

  // Ex 8: Filtro por duração mínima (?minimo=40)
  if (minimo !== undefined) {
    sql += ' AND duracao >= ?';
    params.push(Number(minimo));
  }

  // Ex 10: Busca por nome contendo o texto (?busca=peito)
  if (busca) {
    sql += ' AND nome LIKE ?';
    params.push(`%${busca}%`);
  }

  // Ex 9: Ordenação da maior para a menor duração
  sql += ' ORDER BY duracao DESC';

  const treinos = db.prepare(sql).all(...params);
  res.status(200).json(treinos);
});

// READ (Buscar um por ID com tratamento de ID inválido - Ex 12)
app.get('/treinos/:id', (req, res) => {
  const idParam = req.params.id;
  const id = Number(idParam);

  // Ex 12: Trata ID não numérico ou não inteiro como erro 400
  if (!Number.isInteger(id) || String(id) !== idParam.trim()) {
    return res.status(400).json({ erro: 'O id informado deve ser um numero inteiro.' });
  }

  const treino = db.prepare('SELECT * FROM treinos WHERE id = ?').get(id);
  if (treino === undefined) {
    return res.status(404).json({ erro: 'Treino nao encontrado.' });
  }

  res.status(200).json(treino);
});

// CREATE (Adicionar novo treino)
app.post('/treinos', (req, res) => {
  const erro = validarTreino(req.body);
  if (erro !== null){
    return res.status(400).json({ erro: erro });
  }
  
  // Insere no banco
  const resultado = db
    .prepare('INSERT INTO treinos (nome, duracao) VALUES (?, ?)')
    .run(req.body.nome, req.body.duracao);
  
  // Busca o treino recem-criado para devolver com o id gerado
  const novo = db
    .prepare('SELECT * FROM treinos WHERE id = ?')
    .get(resultado.lastInsertRowid);
  res.status(201).json(novo);
});

// UPDATE (Atualizar treino por ID)
app.put('/treinos/:id', (req, res) => {
  const id = Number(req.params.id);
  const treino = db.prepare('SELECT * FROM treinos WHERE id = ?').get(id);
  if (treino === undefined) {
    return res.status(404).json({ erro: 'Treino nao encontrado.' });
  }
  const erro = validarTreino(req.body);
  if (erro !== null){
    return res.status(400).json({ erro: erro });
  }
  db.prepare('UPDATE treinos SET nome = ?, duracao = ? WHERE id = ?')
    .run(req.body.nome, req.body.duracao, id);
  const atualizado = db.prepare('SELECT * FROM treinos WHERE id = ?').get(id);
  res.status(200).json(atualizado);
});

// DELETE (Remover treino por ID)
app.delete('/treinos/:id', (req, res) => {
  const id = Number(req.params.id);
  const treino = db.prepare('SELECT * FROM treinos WHERE id = ?').get(id);
  if (treino === undefined) {
    return res.status(404).json({ erro: 'Treino nao encontrado.' });
  }
  db.prepare('DELETE FROM treinos WHERE id = ?').run(id);
  res.status(204).end();
});
