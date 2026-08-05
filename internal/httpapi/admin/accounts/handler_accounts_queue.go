package accounts

import "net/http"

func (h *Handler) queueStatus(w http.ResponseWriter, r *http.Request) {
	callerSpaceID, isUser := getCallerSpaceID(r, h.Store)
	if !isUser {
		writeJSON(w, http.StatusOK, h.Pool.Status())
		return
	}
	rawAccounts := h.Store.Snapshot().Accounts
	userTotal := 0
	for _, acc := range rawAccounts {
		if acc.Owner == callerSpaceID {
			userTotal++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"available": userTotal,
		"in_use":    0,
		"total":     userTotal,
	})
}
