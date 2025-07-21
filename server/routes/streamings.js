import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { authenticateToken, requireLevel } from '../middleware/auth.js';
import { logAdminAction } from '../middleware/logger.js';

const router = express.Router();

// Listar streamings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (s.login LIKE ? OR s.email LIKE ? OR s.identificacao LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    // Contar total
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM streamings s 
       ${whereClause}`,
      params
    );

    // Buscar streamings
    const [streamings] = await pool.execute(
      `SELECT s.*, 
              r.nome as revenda_nome,
              ps.nome as plano_nome,
              ws.nome as servidor_nome,
              ws.ip as servidor_ip
       FROM streamings s
       LEFT JOIN revendas r ON s.revenda_id = r.codigo
       LEFT JOIN planos_streaming ps ON s.plano_id = ps.codigo
       LEFT JOIN wowza_servers ws ON s.servidor_id = ws.codigo
       ${whereClause} 
       ORDER BY s.data_criacao DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      streamings,
      total: countResult[0].total
    });

  } catch (error) {
    console.error('Erro ao buscar streamings:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar streaming por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [streamings] = await pool.execute(
      `SELECT s.*, 
              r.nome as revenda_nome,
              ps.nome as plano_nome,
              ws.nome as servidor_nome,
              ws.ip as servidor_ip
       FROM streamings s
       LEFT JOIN revendas r ON s.revenda_id = r.codigo
       LEFT JOIN planos_streaming ps ON s.plano_id = ps.codigo
       LEFT JOIN wowza_servers ws ON s.servidor_id = ws.codigo
       WHERE s.codigo = ?`,
      [req.params.id]
    );

    if (streamings.length === 0) {
      return res.status(404).json({ message: 'Streaming não encontrada' });
    }

    // Remover senha da resposta
    const { senha, ...streamingData } = streamings[0];
    res.json(streamingData);

  } catch (error) {
    console.error('Erro ao buscar streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar streaming
router.post('/', authenticateToken, requireLevel(['super_admin', 'admin']), async (req, res) => {
  try {
    const {
      revenda_id, plano_id, servidor_id, login, senha, identificacao, email,
      espectadores, bitrate, espaco_ftp, transmissao_srt, aplicacao, idioma
    } = req.body;

    // Verificar se login já existe
    const [existingStreaming] = await pool.execute(
      'SELECT codigo FROM streamings WHERE login = ?',
      [login]
    );

    if (existingStreaming.length > 0) {
      return res.status(400).json({ message: 'Login já está em uso' });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    const [result] = await pool.execute(
      `INSERT INTO streamings (
        revenda_id, plano_id, servidor_id, login, senha, identificacao, email,
        espectadores, bitrate, espaco_ftp, transmissao_srt, aplicacao, idioma, criado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        revenda_id, plano_id || null, servidor_id, login, senhaHash, identificacao, email,
        espectadores, bitrate, espaco_ftp, transmissao_srt ? 1 : 0, aplicacao, idioma, req.admin.codigo
      ]
    );

    // Log da ação
    await logAdminAction(req.admin.codigo, 'create', 'streamings', result.insertId, null, req.body, req);

    res.status(201).json({ message: 'Streaming criada com sucesso', codigo: result.insertId });

  } catch (error) {
    console.error('Erro ao criar streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar streaming
router.put('/:id', authenticateToken, requireLevel(['super_admin', 'admin']), async (req, res) => {
  try {
    const streamingId = req.params.id;
    
    // Buscar dados anteriores
    const [streamingAnterior] = await pool.execute(
      'SELECT * FROM streamings WHERE codigo = ?',
      [streamingId]
    );

    if (streamingAnterior.length === 0) {
      return res.status(404).json({ message: 'Streaming não encontrada' });
    }

    const {
      revenda_id, plano_id, servidor_id, login, senha, identificacao, email,
      espectadores, bitrate, espaco_ftp, transmissao_srt, aplicacao, idioma
    } = req.body;

    let updateQuery = `
      UPDATE streamings SET 
        revenda_id = ?, plano_id = ?, servidor_id = ?, login = ?, identificacao = ?, email = ?,
        espectadores = ?, bitrate = ?, espaco_ftp = ?, transmissao_srt = ?, aplicacao = ?, idioma = ?
    `;

    let params = [
      revenda_id, plano_id || null, servidor_id, login, identificacao, email,
      espectadores, bitrate, espaco_ftp, transmissao_srt ? 1 : 0, aplicacao, idioma
    ];

    // Se senha foi fornecida, incluir na atualização
    if (senha && senha.trim() !== '') {
      const senhaHash = await bcrypt.hash(senha, 10);
      updateQuery += ', senha = ?';
      params.push(senhaHash);
    }

    updateQuery += ' WHERE codigo = ?';
    params.push(streamingId);

    await pool.execute(updateQuery, params);

    // Log da ação
    await logAdminAction(req.admin.codigo, 'update', 'streamings', streamingId, streamingAnterior[0], req.body, req);

    res.json({ message: 'Streaming atualizada com sucesso' });

  } catch (error) {
    console.error('Erro ao atualizar streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Controles de streaming
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const streamingId = req.params.id;

    await pool.execute(
      'UPDATE streamings SET status = ? WHERE codigo = ?',
      ['ativo', streamingId]
    );

    // Log da ação
    await logAdminAction(req.admin.codigo, 'start', 'streamings', streamingId, null, { status: 'ativo' }, req);

    res.json({ message: 'Streaming iniciada com sucesso' });

  } catch (error) {
    console.error('Erro ao iniciar streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    const streamingId = req.params.id;

    await pool.execute(
      'UPDATE streamings SET status = ? WHERE codigo = ?',
      ['inativo', streamingId]
    );

    // Log da ação
    await logAdminAction(req.admin.codigo, 'stop', 'streamings', streamingId, null, { status: 'inativo' }, req);

    res.json({ message: 'Streaming parada com sucesso' });

  } catch (error) {
    console.error('Erro ao parar streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/:id/restart', authenticateToken, async (req, res) => {
  try {
    const streamingId = req.params.id;

    // Simular restart (parar e iniciar)
    await pool.execute(
      'UPDATE streamings SET status = ?, ultima_conexao = NOW() WHERE codigo = ?',
      ['ativo', streamingId]
    );

    // Log da ação
    await logAdminAction(req.admin.codigo, 'restart', 'streamings', streamingId, null, null, req);

    res.json({ message: 'Streaming reiniciada com sucesso' });

  } catch (error) {
    console.error('Erro ao reiniciar streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/:id/block', authenticateToken, async (req, res) => {
  try {
    const streamingId = req.params.id;

    await pool.execute(
      'UPDATE streamings SET status = ? WHERE codigo = ?',
      ['bloqueado', streamingId]
    );

    // Log da ação
    await logAdminAction(req.admin.codigo, 'block', 'streamings', streamingId, null, { status: 'bloqueado' }, req);

    res.json({ message: 'Streaming bloqueada com sucesso' });

  } catch (error) {
    console.error('Erro ao bloquear streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/:id/unblock', authenticateToken, async (req, res) => {
  try {
    const streamingId = req.params.id;

    await pool.execute(
      'UPDATE streamings SET status = ? WHERE codigo = ?',
      ['ativo', streamingId]
    );

    // Log da ação
    await logAdminAction(req.admin.codigo, 'unblock', 'streamings', streamingId, null, { status: 'ativo' }, req);

    res.json({ message: 'Streaming desbloqueada com sucesso' });

  } catch (error) {
    console.error('Erro ao desbloquear streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/:id/sync', authenticateToken, async (req, res) => {
  try {
    const streamingId = req.params.id;

    // Simular sincronização
    await pool.execute(
      'UPDATE streamings SET data_atualizacao = NOW() WHERE codigo = ?',
      [streamingId]
    );

    // Log da ação
    await logAdminAction(req.admin.codigo, 'sync', 'streamings', streamingId, null, null, req);

    res.json({ message: 'Streaming sincronizada com sucesso' });

  } catch (error) {
    console.error('Erro ao sincronizar streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/:id/change-password', authenticateToken, async (req, res) => {
  try {
    const streamingId = req.params.id;
    const { senha } = req.body;

    const senhaHash = await bcrypt.hash(senha, 10);

    await pool.execute(
      'UPDATE streamings SET senha = ? WHERE codigo = ?',
      [senhaHash, streamingId]
    );

    // Log da ação
    await logAdminAction(req.admin.codigo, 'change_password', 'streamings', streamingId, null, null, req);

    res.json({ message: 'Senha alterada com sucesso' });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter espectadores conectados (simulado)
router.get('/:id/viewers', authenticateToken, async (req, res) => {
  try {
    // Simular dados de espectadores conectados
    const viewers = [
      {
        ip: '192.168.1.100',
        duration: '00:15:30',
        user_agent: 'VLC Media Player'
      },
      {
        ip: '10.0.0.50',
        duration: '01:22:15',
        user_agent: 'OBS Studio'
      }
    ];

    res.json(viewers);

  } catch (error) {
    console.error('Erro ao buscar espectadores:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Excluir streaming
router.delete('/:id', authenticateToken, requireLevel(['super_admin', 'admin']), async (req, res) => {
  try {
    const streamingId = req.params.id;

    // Buscar dados antes de excluir
    const [streaming] = await pool.execute(
      'SELECT * FROM streamings WHERE codigo = ?',
      [streamingId]
    );

    if (streaming.length === 0) {
      return res.status(404).json({ message: 'Streaming não encontrada' });
    }

    await pool.execute('DELETE FROM streamings WHERE codigo = ?', [streamingId]);

    // Log da ação
    await logAdminAction(req.admin.codigo, 'delete', 'streamings', streamingId, streaming[0], null, req);

    res.json({ message: 'Streaming excluída com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir streaming:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Obter estatísticas de streamings
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_streamings,
        SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as streamings_ativas,
        SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as streamings_inativas,
        SUM(CASE WHEN status = 'bloqueado' THEN 1 ELSE 0 END) as streamings_bloqueadas,
        SUM(espectadores_conectados) as total_espectadores,
        SUM(espaco_usado) as espaco_total_usado
      FROM streamings
    `);

    res.json(stats[0]);

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar streamings por revenda
router.get('/by-revenda/:revendaId', authenticateToken, async (req, res) => {
  try {
    const [streamings] = await pool.execute(
      `SELECT s.*, ps.nome as plano_nome, ws.nome as servidor_nome
       FROM streamings s
       LEFT JOIN planos_streaming ps ON s.plano_id = ps.codigo
       LEFT JOIN wowza_servers ws ON s.servidor_id = ws.codigo
       WHERE s.revenda_id = ?
       ORDER BY s.data_criacao DESC`,
      [req.params.revendaId]
    );

    res.json(streamings);

  } catch (error) {
    console.error('Erro ao buscar streamings da revenda:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;