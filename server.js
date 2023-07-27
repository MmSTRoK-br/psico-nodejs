require('dotenv').config();
console.log('DB Host:', process.env.DB_HOST);
console.log('DB User:', process.env.DB_USER);
console.log('DB Password:', process.env.DB_PASSWORD);
console.log('DB Name:', process.env.DB_NAME);


const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const jwtSecret = 'suus02201998##';


const app = express();

var db;

function handleDisconnect() {
  db = mysql.createPool({
    host: '129.148.55.118',
    user: 'QualityAdmin',
    password: 'Suus0220##',
    database: 'Psico-qslib',
    connectionLimit: 10,
  });


  db.getConnection(function(err, connection) {
    if(err) {
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000);
    }
    if (connection) connection.release();
  });
  
  db.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();


app.use(cors());


app.use(express.json());

app.post('/register', (req, res) => {
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

  db.query(query, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.send({ success: false, message: err.message });
    }
    res.send({ success: true });
  });         
});

// Buscar todos os usuários
app.get('/users', (req, res) => {
  const query = 'SELECT * FROM cadastro_clientes';
  db.query(query, (err, results) => {
    if (err) {
      console.log(err);
      return res.send({ success: false, message: err.message });
    }
    res.send({ success: true, users: results });
  });
});

// Contagem de todos os usuários
app.get('/usercount', (req, res) => {
  const query = 'SELECT COUNT(id) AS count FROM cadastro_clientes';
  db.query(query, (err, results) => {
    if (err) {
      console.log(err);
      return res.send({ success: false, message: err.message });
    }
    res.send({ success: true, count: results[0].count });
  });
});

// Atualizar um usuário
app.put('/cadastro_clientes/:id', (req, res) => {
  const { id } = req.params;
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
    access,  // Adicionado aqui
  } = req.body;

  const query =
    'UPDATE cadastro_clientes SET name = ?, surname = ?, email = ?, birthDate = ?, gender = ?, phone = ?, phone2 = ?, cpf = ?, cnpj = ?, registration = ?, obs = ?, address = ?, number = ?, complement = ?, district = ?, city = ?, state = ?, country = ?, zipCode = ?, unit = ?, sector = ?, role = ?, institution = ?, accessRecovery = ?, access = ? WHERE id = ?';  // Adicionado aqui

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
    access,  // Adicionado aqui
    id,
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.send({ success: false, message: err.message });
    }
    res.send({ success: true });
  });
});


// Excluir um usuário
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM cadastro_clientes WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.log(err);
      return res.send({ success: false, message: err.message });
    }
    if (result.affectedRows === 0) {
      return res.send({ success: false, message: 'User not found' });
    }
    res.send({ success: true, message: `User with ID ${id} deleted` });
  });
});

app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  const query = 'SELECT * FROM login_register WHERE usuario = ?';

  db.query(query, [usuario], (err, results) => {
    if (err) {
      console.log('Erro na consulta do banco de dados:', err);
      return res.status(500).json({ success: false, message: 'Database query error' });
    }

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
  });
});


app.post('/register_usuario', async (req, res) => {
  const { usuario, nome, email, senha, unidade, setor, acesso } = req.body;

  try {
    // Criptografe a senha antes de armazenar no banco de dados
    const senhaHash = await bcrypt.hash(senha, 10);

    const query = 'INSERT INTO login_register (usuario, nome, email, senha, unidade, setor, acesso) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [usuario, nome, email, senhaHash, unidade, setor, acesso];

    db.query(query, values, (err, result) => {
      if (err) {
        console.log(err);
        return res.send({ success: false, message: err.message });
      }
      res.send({ success: true });
    });
  } catch (err) {
    console.log(err);
    return res.send({ success: false, message: err.message });
  }
});


app.delete('/deleteAllUsers', (req, res) => {
  const query = 'DELETE FROM login_register';
  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      return res.send({ success: false, message: 'Falha ao excluir usuários: ' + err.message });
    }

    if (result.affectedRows > 0) {
      res.send({ success: true, message: `${result.affectedRows} usuário(s) foram excluídos.` });
    } else {
      res.send({ success: false, message: 'Não há usuários para excluir.' });
    }
  });
});


app.delete('/deleteAll', (req, res) => {
  const query = 'DELETE FROM cadastro_clientes';
  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      return res.send({ success: false, message: 'Falha ao excluir registros: ' + err.message });
    }

    if (result.affectedRows > 0) {
      res.send({ success: true, message: `${result.affectedRows} registro(s) foram excluídos.` });
    } else {
      res.send({ success: false, message: 'Não há registros para excluir.' });
    }
  });
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
