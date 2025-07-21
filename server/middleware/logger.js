import { pool } from '../config/database.js';

const logAdminAction = async (adminId, acao, tabelaAfetada, registroId = null, dadosAnteriores = null, dadosNovos = null, req) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    await pool.execute(
      `INSERT INTO admin_logs (admin_id, acao, tabela_afetada, registro_id, dados_anteriores, dados_novos, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        acao,
        tabelaAfetada,
        registroId,
        dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
        dadosNovos ? JSON.stringify(dadosNovos) : null,
        ip,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Erro ao registrar log:', error);
  }
};

export { logAdminAction };