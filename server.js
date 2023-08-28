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

  try {
    const connection = await pool.getConnection();
    
    // Check if a user with the same email already exists
    const [existingUsers] = await connection.query('SELECT * FROM cadastro_clientes WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.send({ success: false, message: 'Usuario (Email de acesso) já existente na sua Instituição.' });
    }

    const query =
      'INSERT INTO cadastro_clientes (name, surname, email, birthDate, gender, phone, phone2, cpf, cnpj, registration, obs, address, number, complement, district, city, state, country, zipCode, unit, sector, role, institution, instituicaoNome, accessRecovery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
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
      institution,
      accessRecovery,
      access,
    ];

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
  const { identificador, senha } = req.body;

  const query = 'SELECT * FROM Usuarios WHERE identificador = ?';

  try {
    const connection = await pool.getConnection();
    const [results] = await connection.query(query, [identificador]);
    
    if (results.length === 0) {
      console.log('Nenhum usuário encontrado com o identificador fornecido');
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = results[0];

    if (senha !== user.senha) {
      console.log('Senha fornecida não corresponde à senha do usuário no banco de dados');
      return res.status(401).json({ success: false, message: 'Wrong password' });
    }

    const token = jwt.sign({ id: user.id, role: user.acesso, instituicaoNome: user.instituicaoNome }, jwtSecret, { expiresIn: '1h' });

    if (!token) {
      console.log('Falha ao criar o token JWT');
      return res.status(500).json({ success: false, message: 'Failed to create token' });
    }

    // Inclua o valor de 'instituicaoId' na resposta
  res.json({ success: true, username: user.identificador, role: user.acesso, token, instituicaoNome: user.instituicaoNome }); // Inclui o nome da instituição na resposta
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
    const { cnpj } = req.body;

    // Check if an institution with the same CNPJ already exists
    const [existingInstitutions] = await connection.query('SELECT * FROM Instituicoes WHERE cnpj = ?', [cnpj]);
    if (existingInstitutions.length > 0) {
      return res.status(400).send('Erro ao cadastrar Instituição, já existe uma instituição com esse CNPJ');
    }
    // Início da transação
    await connection.beginTransaction();

    // Destructuring data from the request body
    const {
      nome,
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
    const instituicaoNome = nome; // Nome da instituição

    // Inserting data into Contatos
    for (const contato of contatos) {
      
      console.log('Inserindo contato:', instituicaoId, instituicaoNome, contato.categoria, contato.categoriaEspecifica, contato.nomeCompleto, contato.telefone);
 
      await connection.query(
        'INSERT INTO Contatos (instituicaoId, categoria, categoriaEspecifica, nomeCompleto, telefone, instituicaoNome) VALUES (?, ?, ?, ?, ?, ?)',
        [instituicaoId,contato.categoria, contato.categoriaEspecifica, contato.nomeCompleto, contato.telefone,instituicaoNome]
      );
    }

    // Inserting data into Unidades
    for (const unidade of unidades) {
      await connection.query('INSERT INTO Unidades (instituicaoId,instituicaoNome, unidade) VALUES (?, ?, ?)', [instituicaoId,instituicaoNome, unidade]);
    }

    // Inserting data into Setores
    for (const setor of setores) {
      await connection.query('INSERT INTO Setores (instituicaoId,instituicaoNome, setor) VALUES (?, ?, ?)', [instituicaoId, instituicaoNome,setor]);
    }

    // Inserting data into Cargos
    for (const cargo of cargos) {
      await connection.query('INSERT INTO Cargos (instituicaoId,instituicaoNome, Cargo) VALUES (?, ?, ?)', [instituicaoId, instituicaoNome,cargo]);
    }

    // Inserting data into Usuarios
    for (const usuario of usuarios) {
      
      console.log('Inserindo usuário:', instituicaoId, instituicaoNome, usuario.nome, usuario.identificador, usuario.senha, 'Administrador');
  
      await connection.query('INSERT INTO Usuarios (instituicaoId,instituicaoNome, nome, identificador, senha, acesso) VALUES (?, ?, ?, ?, ?, ?)', [
        instituicaoId,
        instituicaoNome,
        usuario.nome,
        usuario.identificador,
        usuario.senha,
        'Administrador', // Acesso padrão para Administrador
      ]);
    }

 // Confirmação da transação
    await connection.commit();

    res.status(201).send('Instituição registrada com sucesso!');
  } catch (error) {
    // Desfaz a transação
    await connection.rollback();
    console.error(error);
    res.status(500).send('Erro ao registrar a instituição');
  } finally {
    connection.release();
  }
});

app.put('/instituicoes/:id', async (req, res) => {
  const connection = await pool.getConnection();
  const instituicaoId = req.params.id;

  const {
    nome, cnpj, inscricaoEstadual, razaoSocial, logradouro, numero, complemento,
    bairro, cidade, estado, pais, cep, contatos, unidades, setores, cargos, usuarios,
  } = req.body;

  try {
    // Atualizar os detalhes da instituição na tabela Instituicoes
    await connection.query(
      'UPDATE Instituicoes SET nome = ?, cnpj = ?, inscricaoEstadual = ?, razaoSocial = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ?, pais = ?, cep = ? WHERE id = ?',
      [nome, cnpj, inscricaoEstadual, razaoSocial, logradouro, numero, complemento, bairro, cidade, estado, pais, cep, instituicaoId]
    );

    // Atualizar outras tabelas (Contatos, Unidades, Setores, Cargos, Usuarios) se necessário

    res.status(200).send('Instituição atualizada com sucesso!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao atualizar a instituição');
  } finally {
    connection.release();
  }
});

app.delete('/instituicoes/:id', async (req, res) => {
  console.log('Objeto completo de parâmetros:', req.params); // Log dos parâmetros

  // Assumindo que o ID é extraído diretamente dos parâmetros (ajuste conforme necessário)
  const instituicaoId = req.params.id;

  console.log('ID da instituição:', instituicaoId); // Log do ID

  const connection = await pool.getConnection();

  try {
    // Iniciar transação
    await connection.beginTransaction();

    // Lista de tabelas relacionadas
    const relatedTables = ['Contatos', 'Unidades', 'Setores', 'Cargos', 'Usuarios'];
    
    // Excluir dados relacionados em outras tabelas usando instituicaoId
    for (const table of relatedTables) {
      const [result] = await connection.query(`DELETE FROM ${table} WHERE instituicaoId = ?`, [instituicaoId]);
      console.log(`Registros excluídos da tabela ${table}:`, result.affectedRows);
      if (result.affectedRows === 0) {
        console.warn(`Nenhum registro encontrado para exclusão na tabela ${table} para instituicaoId: ${instituicaoId}`);
      }
    }

    // Excluir a instituição da tabela Instituicoes usando o ID
    const [deleteInstituicaoResult] = await connection.query('DELETE FROM Instituicoes WHERE id = ?', [instituicaoId]);
    if (deleteInstituicaoResult.affectedRows === 0) {
      throw new Error(`Instituição com ID ${instituicaoId} não encontrada`);
    }

    // Confirmar transação
    await connection.commit();
    res.status(200).send('Instituição excluída com sucesso!');
  } catch (error) {
    // Reverter transação em caso de erro
    await connection.rollback();
    console.error(error);
    res.status(500).send('Erro ao excluir a instituição');
  } finally {
    connection.release();
  }
});








app.get('/instituicoes', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const [instituicoes] = await connection.query('SELECT * FROM Instituicoes');
    res.status(200).json(instituicoes);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar as instituições');
  } finally {
    connection.release();
  }
});

app.get('/instituicao-detalhes', async (req, res) => {
  const connection = await pool.getConnection();
  const instituicaoId = req.query.instituicaoId;

  try {
    const [instituicao] = await connection.query(
      'SELECT instituicao, cnpj, inscricaoEstadual, razaoSocial, logradouro, numero, complemento, bairro, cidade, estado, pais, cep FROM Instituicoes WHERE id = ?',
      [instituicaoId]
    );
    res.status(200).json(instituicao);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar detalhes da instituição');
  } finally {
    connection.release();
  }
});

app.get('/cargos', async (req, res) => {
  const connection = await pool.getConnection();
  const instituicaoId = req.query.instituicaoId;

  try {
    const [cargos] = await connection.query('SELECT * FROM Cargos WHERE instituicaoId = ?', [instituicaoId]);
    res.status(200).json(cargos);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar os cargos');
  } finally {
    connection.release();
  }
});

app.get('/contatos', async (req, res) => {
  const connection = await pool.getConnection();
  const instituicaoId = req.query.instituicaoId;

  try {
    const [contatos] = await connection.query('SELECT * FROM Contatos WHERE instituicaoId = ?', [instituicaoId]);
    res.status(200).json(contatos);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar os contatos');
  } finally {
    connection.release();
  }
});

app.get('/setores', async (req, res) => {
  const connection = await pool.getConnection();
  const instituicaoId = req.query.instituicaoId;

  try {
    const [setores] = await connection.query('SELECT * FROM Setores WHERE instituicaoId = ?', [instituicaoId]);
    res.status(200).json(setores);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar os setores');
  } finally {
    connection.release();
  }
});

app.get('/unidades', async (req, res) => {
  const connection = await pool.getConnection();
  const instituicaoId = req.query.instituicaoId;

  try {
    const [unidades] = await connection.query('SELECT * FROM Unidades WHERE instituicaoId = ?', [instituicaoId]);
    res.status(200).json(unidades);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar as unidades');
  } finally {
    connection.release();
  }
});

app.get('/usuarios', async (req, res) => {
  const connection = await pool.getConnection();
  const instituicaoNome = req.query.instituicaoNome;

  try {
    // Modify the query to search users from the Cadastro_clientes table
    const [usuarios] = await connection.query('SELECT * FROM cadastro_clientes WHERE instituicaoNome = ?', [instituicaoNome]);
    res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar os usuários');
  } finally {
    connection.release();
  }
});

app.get('/usuarios_instituicao', async (req, res) => {
  const instituicaoId = req.query.instituicaoId; // Obter o ID da instituição da query

  try {
    // Execute a query para buscar usuários da tabela Usuarios que correspondem ao ID da instituição
    const [usuarios] = await pool.query('SELECT nome, identificador, senha, acesso FROM Usuarios WHERE instituicaoId = ?', [instituicaoId]);
    
    // Enviar os usuários como resposta JSON
    res.status(200).json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar usuários');
  }
});


app.post('/salvar-instituicao', async (req, res) => {
  try {
    const { instituicoes, cargos, contatos, setores, unidades, usuarios } = req.body;
    console.log('Received data:', req.body);

    const connection = await pool.getConnection();
    // Updating instituicoes
    const instituicoesData = instituicoes[0]; // Get the first object from the array
    const instituicoesValues = [
      instituicoesData.instituicao,
      instituicoesData.cnpj,
      instituicoesData.inscricaoEstadual,
      instituicoesData.razaoSocial,
      instituicoesData.logradouro,
      instituicoesData.numero,
      instituicoesData.complemento,
      instituicoesData.bairro,
      instituicoesData.cidade,
      instituicoesData.estado,
      instituicoesData.pais,
      instituicoesData.cep,
      instituicoesData.id // Assuming the ID is provided in the data
    ];
    console.log('Instituicoes values:', instituicoesValues); // Log the values
    const instituicoesQuery = `UPDATE Instituicoes SET instituicao = ?, cnpj = ?, inscricaoEstadual = ?, razaoSocial = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ?, pais = ?, cep = ? WHERE id = ?;`;
    await connection.execute(instituicoesQuery, instituicoesValues);


    // Updating cargos, contatos, setores, and unidades
    const tables = { cargos, contatos, setores, unidades };
    for (const [table, data] of Object.entries(tables)) {
      const query = `UPDATE ${table.charAt(0).toUpperCase() + table.slice(1)} SET ${table.slice(0, -1)} = ? WHERE instituicaoId = ?;`;
      for (const item of data) {
        await connection.execute(query, [item[table.slice(0, -1)], instituicaoId]);
      }
    }

    // Define the query for updating Usuarios
    const usuariosQuery = `UPDATE Usuarios SET nome = ?, identificador = ?, senha = ?, acesso = ? WHERE id = ?;`;

    // Updating usuarios
    for (const item of usuarios) {
      console.log('Updating user:', item);
      const { nome, identificador, senha, acesso, id } = item;

      if ([nome, identificador, senha, acesso, id].includes(undefined)) {
        console.error('One or more fields are undefined:', item);
        continue;
      }

      await connection.execute(usuariosQuery, [nome, identificador, senha, acesso, id]);
    }

    connection.release();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar as alterações:', error);
    res.status(500).send('Erro ao salvar as alterações');
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

// In server.js

app.post("/api/user/login", async (req, res) => {
  const { email, senha } = req.body;

  // Query para encontrar o usuário com o e-mail e a senha fornecidos
  const query = "SELECT * FROM cadastro_clientes WHERE email = ? AND senha = ?";

  try {
    const [results] = await pool.execute(query, [email, senha]);
    if (results.length > 0) {
      const user = results[0];

      // Gerar um token JWT (ou outro mecanismo de autenticação)
      const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '1h' });

      res.json({
        success: true,
        message: 'Login bem-sucedido!',
        token: token,
        username: user.name, // Supondo que o nome do usuário está na coluna 'nome'
        institution: user.institution,
        role: 'Visualizador',
        birthDate: user.birthDate,
        cpf: user.cpf
      });
    } else {
      res.status(401).json({ success: false, message: 'Credenciais inválidas!' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post('/programas', async (req, res) => {
  try {
    const { nome_programa, link_form, instituicaoNome } = req.body; // Extraia instituicaoNome
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO programas (nome_programa, link_form, instituicaoNome) VALUES (?, ?, ?)',
      [nome_programa, link_form, instituicaoNome] // Inclua instituicaoNome
    );
    connection.release();
    res.json({ success: true, message: 'Programa criado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao criar programa' });
  }
});

app.get('/programas', async (req, res) => {
  try {
    const instituicaoNome = req.query.instituicaoNome; // Pegue o nome da instituição da query string
    const connection = await pool.getConnection();
    // Modifique a consulta para filtrar com base na coluna "instituicaoNome"
    const [result] = await connection.query('SELECT * FROM programas WHERE instituicaoNome = ?', [instituicaoNome]);
    connection.release();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erro ao listar programas' });
  }
});



app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM cadastro_clientes WHERE email AND senha = ?',
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
  const { name, email } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM cadastro_clientes WHERE name = ? AND email = ?',
      [name, email]
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
  const { name, email, senha } = req.body;
  try {
    await pool.execute(
      'UPDATE cadastro_clientes SET senha = ? WHERE name = ? AND email = ?',
      [senha, name, email]
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

// Nova rota para obter a contagem de usuários por instituição
app.get('/api/UserCountByInstitution', async (req, res) => {
  const institutionName = req.query.instituicaoNome;

  try {
    // Obter uma conexão do pool
    const connection = await pool.getConnection();

    // Consulta SQL para contar os usuários com o mesmo nome de instituição
    const [rows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM Usuarios WHERE instituicaoNome = ?",
      [institutionName]
    );

    // Liberar a conexão de volta para o pool
    connection.release();

    // Enviar a contagem como resposta
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Erro ao contar usuários:', error);
    res.status(500).send('Erro interno do servidor');
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