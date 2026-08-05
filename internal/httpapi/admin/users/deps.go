package users

import adminshared "ds2api/internal/httpapi/admin/shared"

type Handler struct {
	Store       adminshared.ConfigStore
	Pool        adminshared.PoolController
	DS          adminshared.DeepSeekCaller
	OpenAI      adminshared.OpenAIChatCaller
	ChatHistory adminshared.ChatHistoryStore
}
