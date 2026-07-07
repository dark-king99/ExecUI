
export const aibotService = {
  chat: (data) => apiClient.post('/ai/chat', data),
  getSession: (sessionId) => apiClient.get(`/ai/sessions/${sessionId}`),
  createSession: () => apiClient.post('/ai/sessions'),
  getSuggestions: (context) => apiClient.get('/ai/suggestions', { params: { context } }),
  getHistory: (sessionId) => apiClient.get(`/ai/sessions/${sessionId}/messages`),
}

export default aibotService
