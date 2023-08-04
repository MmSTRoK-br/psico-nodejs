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
const { cpf, cnpj } = require('cpf-cnpj-validator');


const app = express();

const pool = mysql.createPool({
  host: '129.148.55.118',
  user: 'QualityAdmin',
  password: 'Suus0220##',
  database: 'Psico-qslib',
  connectionLimit: 10,
});

app.use(cors({ origin: ['http://localhost:3000', 'https://fair-ruby-caterpillar-wig.cyclic.app'] }));

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


const validator = require('validator');


app.post('/nova-instituicao', async (req, res) => {
  const {
    instituicao,
    cnpj,
    inscricao_estadual,
    razao_social,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    contatos,
    unidades,
    setores,
    cargos,
    usuarios,
  } = req.body;

  try {
    // Inserir a instituição
    const novaInstituicao = await Instituicao.create({
      instituicao,
      cnpj,
      inscricao_estadual,
      razao_social,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
    });

    // Inserir os contatos, unidades, setores, cargos e usuários relacionados
    await Promise.all([
      Contato.bulkCreate(contatos.map(c => ({ ...c, instituicao_id: novaInstituicao.id }))),
      Unidade.bulkCreate(unidades.map(u => ({ ...u, instituicao_id: novaInstituicao.id }))),
      Setor.bulkCreate(setores.map(s => ({ ...s, instituicao_id: novaInstituicao.id }))),
      Cargo.bulkCreate(cargos.map(c => ({ ...c, instituicao_id: novaInstituicao.id }))),
      Usuario.bulkCreate(usuarios.map(u => ({ ...u, instituicao_id: novaInstituicao.id }))),
    ]);

    res.status(200).send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(400).send({ success: false, message: 'Erro ao criar instituição.' });
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

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));