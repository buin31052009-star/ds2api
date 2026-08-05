package users

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"ds2api/internal/config"
	adminshared "ds2api/internal/httpapi/admin/shared"
)

func (h *Handler) listUsers(w http.ResponseWriter, _ *http.Request) {
	users := h.Store.Users()
	snap := h.Store.Snapshot()
	accounts := snap.Accounts

	// Group accounts by owner ID
	userAccountsMap := make(map[string][]config.Account)
	for _, acc := range accounts {
		owner := strings.TrimSpace(acc.Owner)
		if owner != "" {
			userAccountsMap[owner] = append(userAccountsMap[owner], acc)
		}
	}

	type UserWithAccounts struct {
		config.User
		Accounts     []config.Account `json:"accounts"`
		AccountCount int              `json:"account_count"`
	}

	result := make([]UserWithAccounts, 0, len(users))
	for _, u := range users {
		accs := userAccountsMap[u.ID]
		if accs == nil {
			accs = []config.Account{}
		}
		result = append(result, UserWithAccounts{
			User:         u,
			Accounts:     accs,
			AccountCount: len(accs),
		})
	}

	adminshared.WriteJSON(w, http.StatusOK, map[string]any{
		"users": result,
		"count": len(result),
	})
}

func (h *Handler) addUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name   string `json:"name"`
		Remark string `json:"remark"`
		Key    string `json:"key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		adminshared.WriteJSON(w, http.StatusBadRequest, map[string]any{"detail": "Dữ liệu JSON không hợp lệ"})
		return
	}

	name := strings.TrimSpace(body.Name)
	key := strings.TrimSpace(body.Key)
	if name == "" {
		name = "User_" + randomHex(3)
	}
	if key == "" {
		key = "usr_" + randomHex(12)
	}

	userID := "usr_" + randomHex(8)
	u := config.User{
		ID:        userID,
		Name:      name,
		Key:       key,
		Remark:    strings.TrimSpace(body.Remark),
		CreatedAt: time.Now().Unix(),
	}

	if err := h.Store.AddUser(u); err != nil {
		adminshared.WriteJSON(w, http.StatusInternalServerError, map[string]any{"detail": err.Error()})
		return
	}

	adminshared.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"user":    u,
	})
}

func (h *Handler) deleteUser(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(chi.URLParam(r, "id"))
	if id == "" {
		adminshared.WriteJSON(w, http.StatusBadRequest, map[string]any{"detail": "Vui lòng cung cấp ID người dùng"})
		return
	}

	if err := h.Store.DeleteUser(id); err != nil {
		adminshared.WriteJSON(w, http.StatusInternalServerError, map[string]any{"detail": err.Error()})
		return
	}

	adminshared.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

func randomHex(bytesLen int) string {
	b := make([]byte, bytesLen)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
