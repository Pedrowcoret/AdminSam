import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Estatísticas do dashboard
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Total de revendas
    const [totalRevendas] = await pool.execute(
      'SELECT COUNT(*) as total FROM revendas'
    );

    // Revendas por status
    const [revendasPorStatus] = await pool.execute(
      `SELECT 
        status_detalhado,
        COUNT(*) as total
       FROM revendas 
       GROUP BY status_detalhado`
    );

    // Somar recursos
    const [recursos] = await pool.execute(
      `SELECT 
        SUM(streamings) as totalStreamings,
        SUM(espectadores) as totalEspectadores,
        SUM(espaco_usado_mb) as espacoUsado,
        SUM(bitrate) as totalBitrate
       FROM revendas`
    );

    // Organizar dados por status
    const statusData = {
      revendasAtivas: 0,
      revendasSuspensas: 0,
      revendasExpiradas: 0,
      revendasCanceladas: 0,
      revendasTeste: 0
    };

    revendasPorStatus.forEach(item => {
      switch (item.status_detalhado) {
        case 'ativo':
          statusData.revendasAtivas = item.total;
          break;
        case 'suspenso':
          statusData.revendasSuspensas = item.total;
          break;
        case 'expirado':
          statusData.revendasExpiradas = item.total;
          break;
        case 'cancelado':
          statusData.revendasCanceladas = item.total;
          break;
        case 'teste':
          statusData.revendasTeste = item.total;
          break;
      }
    });

    res.json({
      totalRevendas: totalRevendas[0].total,
      ...statusData,
      totalStreamings: recursos[0].totalStreamings || 0,
      totalEspectadores: recursos[0].totalEspectadores || 0,
      espacoUsado: recursos[0].espacoUsado || 0,
      totalBitrate: recursos[0].totalBitrate || 0
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;