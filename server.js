require('dotenv').config();
console.log('DB Host:', process.env.DB_HOST);
console.log('DB User:', process.env.DB_USER);
console.log('DB Password:', process.env.DB_PASSWORD);
console.log('DB Name:', process.env.DB_NAME);

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const jwtSecret = 'suus02201998##';


const app = express();

const pool = mysql.createPool({
  host: '129.148.55.118',
  user: 'QualityAdmin',
  password: 'Suus0220##',
  database: 'Psico-qslib',
  connectionLimit: 10,
});

app.use(cors({
  origin: ['http://localhost:3000', 'https://fair-ruby-caterpillar-wig.cyclic.app', 'https://psico-painel.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


app.use(express.json());

app.post('/register', async (req, res) => {
  const {
    name,
    surname,
    email,
    birthDate,
    gender,
    phone,
    phone2,
    cpf,
    cnpj,
    registration,
    obs,
    address,
    number,
    complement,
    district,
    city,
    state,
    country,
    zipCode,
    unit,
    sector,
    role,
    institution,
    accessRecovery,
    access, 
  } = req.body;

  const query =
    'INSERT INTO cadastro_clientes (name, surname, email, birthDate, gender, phone, phone2, cpf, cnpj, registration, obs, address, number, complement, district, city, state, country, zipCode, unit, sector, role, institution, accessRecovery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [
    name,
    surname,
    email,
    birthDate,
    gender,
    phone,
    phone2,
    cpf,
    cnpj,
    registration,
    obs,
    address,
    number,
    complement,
    district,
    city,
    state,
    country,
    zipCode,
    unit,
    sector,
    role,
    institution,
    accessRecovery,
    access, 
  ];

  try {
    const connection = await pool.getConnection();
    await connection.query(query, values);
    res.send({ success: true });
  } catch (err) {
    console.log(err);
    return res.send({ success: false, message: err.message });
  } finally {
    if (connection) connection.release();
  }         
});


app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  const query = 'SELECT * FROM login_register WHERE usuario = ?';

  try {
    const connection = await pool.getConnection();
    const [results] = await connection.query(query, [usuario]);
    
    if (results.length === 0) {
      console.log('Nenhum usuário encontrado com o nome de usuário fornecido');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = results[0];

    const isMatch = bcrypt.compareSync(senha, user.senha);
    if (!isMatch) {
      console.log('Senha fornecida não corresponde à senha do usuário no banco de dados');
      return res.status(401).json({ success: false, message: 'Wrong password' });
    }

    const token = jwt.sign({ id: user.id, role: user.acesso }, jwtSecret, { expiresIn: '1h' });
    if (!token) {
      console.log('Falha ao criar o token JWT');
      return res.status(500).json({ success: false, message: 'Failed to create token' });
    }

    res.cookie('token', token, { httpOnly: true });
    console.log('Login bem sucedido, token gerado:', token);
    
    res.json({ success: true, username: user.usuario, role: user.acesso, token });
  } catch (err) {
    console.log('Erro na consulta do banco de dados:', err);
    return res.status(500).json({ success: false, message: 'Database query error' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/instituicoes', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Begin transaction
    await connection.beginTransaction();

    // Destructuring data from the request body
    const {
      nome,
      cnpj,
      inscricaoEstadual,
      razaoSocial,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      pais,
      cep,
      contatos,
      unidades,
      setores,
      cargos,
      usuarios,
    } = req.body;

    // Inserting data into Instituicoes
    const [instituicaoResult] = await connection.query(
      'INSERT INTO Instituicoes (instituicao, cnpj, inscricaoEstadual, razaoSocial, logradouro, numero, complemento, bairro, cidade, estado, pais, cep) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nome, cnpj, inscricaoEstadual, razaoSocial, logradouro, numero, complemento, bairro, cidade, estado, pais, cep]
    );

    const instituicaoId = instituicaoResult.insertId;

    // Inserting data into Contatos
    for (const contato of contatos) {
      await connection.query(
        'INSERT INTO Contatos (instituicaoId, categoria, categoriaEspecifica, nomeCompleto, telefone) VALUES (?, ?, ?, ?, ?)',
        [instituicaoId, contato.categoria, contato.categoriaEspecifica, contato.nomeCompleto, contato.telefone]
      );
    }

    // Inserting data into Unidades
    for (const unidade of unidades) {
      await connection.query('INSERT INTO Unidades (instituicaoId, unidade) VALUES (?, ?)', [instituicaoId, unidade]);
    }

    // Inserting data into Setores
    for (const setor of setores) {
      await connection.query('INSERT INTO Setores (instituicaoId, setor) VALUES (?, ?)', [instituicaoId, setor]);
    }

    // Inserting data into Cargos
    for (const cargo of cargos) {
      await connection.query('INSERT INTO Cargos (instituicaoId, Cargo) VALUES (?, ?)', [instituicaoId, cargo]);
    }

    // Inserting data into Usuarios
    for (const usuario of usuarios) {
      await connection.query('INSERT INTO Usuarios (instituicaoId, nome, identificador) VALUES (?, ?, ?)', [
        instituicaoId,
        usuario.nome,
        usuario.identificador,
      ]);
    }

    // Commit transaction
    await connection.commit();

    res.status(201).send('Instituição registrada com sucesso!');
  } catch (error) {
    // Rollback transaction
    await connection.rollback();
    console.error(error);
    res.status(500).send('Erro ao registrar a instituição');
  } finally {
    connection.release();
  }
});

app.post('/register_usuario', async (req, res) => {
  const { usuario, nome, email, senha, unidade, setor, acesso } = req.body;

  try {
    // Criptografe a senha antes de armazenar no banco de dados
    const senhaHash = await bcrypt.hash(senha, 10);

    const query = 'INSERT INTO login_register (usuario, nome, email, senha, unidade, setor, acesso) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [usuario, nome, email, senhaHash, unidade, setor, acesso];

    const connection = await pool.getConnection();
    const [result] = await connection.query(query, values);

    res.send({ success: true });
  } catch (err) {
    console.log(err);
    return res.send({ success: false, message: err.message });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/deleteAllUsers', async (req, res) => {
  const query = 'DELETE FROM login_register';
  
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(query);

    if (result.affectedRows > 0) {
      res.send({ success: true, message: `${result.affectedRows} usuário(s) foram excluídos.` });
    } else {
      res.send({ success: false, message: 'Não há usuários para excluir.' });
    }
  } catch (err) {
    console.log(err);
    return res.send({ success: false, message: 'Falha ao excluir usuários: ' + err.message });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM Usuarios WHERE (nome = ? OR identificador = ?) AND senha = ?',
      [usuario, usuario, senha]
    );
    if (rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao realizar login' });
  }
});

app.post('/api/verifyUser', async (req, res) => {
  const { nome, identificador } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM Usuarios WHERE nome = ? AND identificador = ?',
      [nome, identificador]
    );
    if (rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao verificar usuário' });
  }
});

app.post('/api/registerPassword', async (req, res) => {
  const { nome, identificador, senha } = req.body;
  try {
    await pool.execute(
      'UPDATE Usuarios SET senha = ? WHERE nome = ? AND identificador = ?',
      [senha, nome, identificador]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao cadastrar senha' });
  }
});


app.delete('/deleteAll', async (req, res) => {
  const query = 'DELETE FROM cadastro_clientes';

  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(query);

    if (result.affectedRows > 0) {
      res.send({ success: true, message: `${result.affectedRows} registro(s) foram excluídos.` });
    } else {
      res.send({ success: false, message: 'Não há registros para excluir.' });
    }
  } catch (err) {
    console.log(err);
    return res.send({ success: false, message: 'Falha ao excluir registros: ' + err.message });
  } finally {
    if (connection) connection.release();
  }
});


app.use((req, res, next) => {
  // Se não há token na requisição, passe para a próxima rota
  if (!req.headers.authorization) return next();

  // Decodificar o token
  const token = req.headers.authorization.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
  } catch (error) {
    console.log('Error decoding JWT: ', error);
  }
  

  next();
});

const protectedRoutes = [
  { url: '/deleteAll', methods: ['DELETE'], roles: ['admin'] },
  // Adicione outras rotas protegidas aqui
];

app.use((req, res, next) => {
  if (!req.user) return next();

  const protectedRoute = protectedRoutes.find(
    (route) => route.url === req.path && route.methods.includes(req.method)
  );

  if (protectedRoute && !protectedRoute.roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  next();
});

app.get('/usercount', async (req, res) => {
  try {
      const [rows] = await pool.query('SELECT COUNT(*) as count FROM cadastro_clientes');
      res.json({ count: rows[0].count });
  } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao buscar contagem de usuários.');
  }
});


// 1. Obter todos os usuários
app.get('/usuarios', async (req, res) => {
  try {
      const [rows] = await pool.query('SELECT * FROM cadastro_clientes');
      res.json(rows);
  } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao buscar usuários.');
  }
});

app.put('/cadastro_clientes/:id', async (req, res) => {
  const id = req.params.id;
  const {
      name, surname, email, birthDate, gender, phone, phone2, cpf, cnpj,
      registration, obs, address, number, complement, district, city, state,
      country, zipCode, unit, sector, role, institution, accessRecovery, access
  } = req.body;

  try {
      const connection = await pool.getConnection();

      const query = `
          UPDATE cadastro_clientes SET
              name = ?,
              surname = ?,
              email = ?,
              birthDate = ?,
              gender = ?,
              phone = ?,
              phone2 = ?,
              cpf = ?,
              cnpj = ?,
              registration = ?,
              obs = ?,
              address = ?,
              number = ?,
              complement = ?,
              district = ?,
              city = ?,
              state = ?,
              country = ?,
              zipCode = ?,
              unit = ?,
              sector = ?,
              role = ?,
              institution = ?,
              accessRecovery = ?,
              access = ?
          WHERE id = ?
      `;

      await connection.query(query, [
          name, surname, email, birthDate, gender, phone, phone2, cpf, cnpj,
          registration, obs, address, number, complement, district, city, state,
          country, zipCode, unit, sector, role, institution, accessRecovery, access,
          id
      ]);

      connection.release();
      res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
  } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});


// 3. Deletar um usuário
app.delete('/usuarios/:id', async (req, res) => {
  const userId = req.params.id;

  try {
      const result = await pool.query('DELETE FROM cadastro_clientes WHERE id = ?', [userId]);
      if (result[0].affectedRows === 0) {
          res.status(404).send('Usuário não encontrado.');
          return;
      }
      res.send('Usuário deletado com sucesso.');
  } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao deletar usuário.');
  }
});


const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));