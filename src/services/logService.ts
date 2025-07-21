import { AdminLog } from '../types/admin';

class LogService {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  private getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getLogs(page: number = 1, limit: number = 10, filters?: any): Promise<{ logs: AdminLog[]; total: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await fetch(`${this.baseURL}/logs?${params}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar logs');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

export const logService = new LogService();