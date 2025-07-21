export interface Streaming {
  codigo: number;
  revenda_id: number;
  revenda_nome: string;
  plano_id?: number;
  plano_nome?: string;
  servidor_id: number;
  servidor_nome: string;
  servidor_ip: string;
  login: string;
  senha: string;
  identificacao: string;
  email: string;
  espectadores: number;
  bitrate: number;
  espaco_ftp: number;
  transmissao_srt: boolean;
  aplicacao: 'tv_station_live_ondemand' | 'live' | 'webrtc' | 'ondemand' | 'ip_camera';
  idioma: string;
  status: 'ativo' | 'inativo' | 'bloqueado' | 'suspenso';
  espectadores_conectados: number;
  espaco_usado: number;
  ultima_conexao?: string;
  data_criacao: string;
  data_atualizacao: string;
  criado_por: number;
}

export interface StreamingFormData {
  revenda_id: number;
  plano_id?: number;
  servidor_id: number;
  login: string;
  senha: string;
  identificacao: string;
  email: string;
  espectadores: number;
  bitrate: number;
  espaco_ftp: number;
  transmissao_srt: boolean;
  aplicacao: 'tv_station_live_ondemand' | 'live' | 'webrtc' | 'ondemand' | 'ip_camera';
  idioma: string;
}

export interface StreamingStats {
  total_streamings: number;
  streamings_ativas: number;
  streamings_inativas: number;
  streamings_bloqueadas: number;
  total_espectadores: number;
  espaco_total_usado: number;
}