package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

func (s *Store) ModelAliases() map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := DefaultModelAliases()
	for k, v := range s.cfg.ModelAliases {
		key := strings.TrimSpace(lower(k))
		val := strings.TrimSpace(lower(v))
		if key == "" || val == "" {
			continue
		}
		out[key] = val
	}
	return out
}

func (s *Store) ToolcallMode() string {
	return "feature_match"
}

func (s *Store) ToolcallEarlyEmitConfidence() string {
	return "high"
}

func (s *Store) ResponsesStoreTTLSeconds() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Responses.StoreTTLSeconds > 0 {
		return s.cfg.Responses.StoreTTLSeconds
	}
	return 900
}

func (s *Store) EmbeddingsProvider() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return strings.TrimSpace(s.cfg.Embeddings.Provider)
}

func (s *Store) AutoDeleteMode() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	mode := strings.ToLower(strings.TrimSpace(s.cfg.AutoDelete.Mode))
	switch mode {
	case "none", "single", "all":
		return mode
	}
	if s.cfg.AutoDelete.Sessions {
		return "all"
	}
	return "none"
}

func (s *Store) AdminPasswordHash() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return strings.TrimSpace(s.cfg.Admin.PasswordHash)
}

func (s *Store) AdminJWTExpireHours() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Admin.JWTExpireHours > 0 {
		return s.cfg.Admin.JWTExpireHours
	}
	if raw := strings.TrimSpace(os.Getenv("DS2API_JWT_EXPIRE_HOURS")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return n
		}
	}
	return 24
}

func (s *Store) AdminJWTValidAfterUnix() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cfg.Admin.JWTValidAfterUnix
}

func (s *Store) RuntimeAccountMaxInflight() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Runtime.AccountMaxInflight > 0 {
		return s.cfg.Runtime.AccountMaxInflight
	}
	if raw := strings.TrimSpace(os.Getenv("DS2API_ACCOUNT_MAX_INFLIGHT")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return n
		}
	}
	return 2
}

func (s *Store) RuntimeAccountMaxQueue(defaultSize int) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Runtime.AccountMaxQueue > 0 {
		return s.cfg.Runtime.AccountMaxQueue
	}
	if raw := strings.TrimSpace(os.Getenv("DS2API_ACCOUNT_MAX_QUEUE")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n >= 0 {
			return n
		}
	}
	if defaultSize < 0 {
		return 0
	}
	return defaultSize
}

func (s *Store) RuntimeGlobalMaxInflight(defaultSize int) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Runtime.GlobalMaxInflight > 0 {
		return s.cfg.Runtime.GlobalMaxInflight
	}
	if raw := strings.TrimSpace(os.Getenv("DS2API_GLOBAL_MAX_INFLIGHT")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return n
		}
	}
	if defaultSize < 0 {
		return 0
	}
	return defaultSize
}

func (s *Store) RuntimeTokenRefreshIntervalHours() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Runtime.TokenRefreshIntervalHours > 0 {
		return s.cfg.Runtime.TokenRefreshIntervalHours
	}
	return 6
}

func (s *Store) AutoDeleteSessions() bool {
	return s.AutoDeleteMode() != "none"
}

func (s *Store) CurrentInputFileEnabled() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.CurrentInputFile.Enabled == nil {
		return true
	}
	return *s.cfg.CurrentInputFile.Enabled
}

func (s *Store) CurrentInputFileMinChars() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cfg.CurrentInputFile.MinChars
}

func (s *Store) ThinkingInjectionEnabled() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.ThinkingInjection.Enabled == nil {
		return true
	}
	return *s.cfg.ThinkingInjection.Enabled
}

func (s *Store) ThinkingInjectionPrompt() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return strings.TrimSpace(s.cfg.ThinkingInjection.Prompt)
}

func (s *Store) Users() []User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]User, len(s.cfg.Users))
	copy(out, s.cfg.Users)
	envUsers := s.loadUsersFromEnv()
	out = append(out, envUsers...)
	return out
}

func (s *Store) GetUserByKey(key string) (User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key = strings.Trim(strings.TrimSpace(key), "\"'`")
	if key == "" {
		return User{}, false
	}
	for _, u := range s.cfg.Users {
		uk := strings.Trim(strings.TrimSpace(u.Key), "\"'`")
		if uk == key || strings.EqualFold(uk, key) {
			return u, true
		}
	}
	for _, u := range s.loadUsersFromEnv() {
		uk := strings.Trim(strings.TrimSpace(u.Key), "\"'`")
		if uk == key || strings.EqualFold(uk, key) {
			return u, true
		}
	}
	return User{}, false
}

func (s *Store) loadUsersFromEnv() []User {
	var envUsers []User
	seenKeys := make(map[string]bool)

	for _, env := range os.Environ() {
		pair := strings.SplitN(env, "=", 2)
		if len(pair) != 2 {
			continue
		}
		varName := strings.TrimSpace(pair[0])
		varUpper := strings.ToUpper(varName)
		varValue := strings.Trim(strings.TrimSpace(pair[1]), "\"'`")
		if varValue == "" {
			continue
		}

		// 1. Quét các biến dạng DS2API_USER_KEY_FOO hoặc DS2API_KEY_FOO
		if strings.HasPrefix(varUpper, "DS2API_USER_KEY_") || (strings.HasPrefix(varUpper, "DS2API_KEY_") && varUpper != "DS2API_ADMIN_KEY") {
			name := varName
			if strings.HasPrefix(varUpper, "DS2API_USER_KEY_") {
				name = varName[len("DS2API_USER_KEY_"):]
			} else {
				name = varName[len("DS2API_KEY_"):]
			}
			name = strings.TrimSpace(name)
			if name == "" {
				name = "User"
			}
			userID := "env_" + strings.ToLower(name)
			if !seenKeys[varValue] {
				seenKeys[varValue] = true
				envUsers = append(envUsers, User{
					ID:     userID,
					Name:   name,
					Key:    varValue,
					Remark: "Khởi tạo từ biến môi trường " + varName,
				})
			}
		}

		// 2. Quét biến DS2API_USER_KEYS (ví dụ hung:key123,nam:key456)
		if varUpper == "DS2API_USER_KEYS" {
			parts := strings.Split(varValue, ",")
			for idx, p := range parts {
				p = strings.Trim(strings.TrimSpace(p), "\"'`")
				if p == "" {
					continue
				}
				uname := fmt.Sprintf("User_%d", idx+1)
				ukey := p
				if strings.Contains(p, ":") {
					kv := strings.SplitN(p, ":", 2)
					uname = strings.Trim(strings.TrimSpace(kv[0]), "\"'`")
					ukey = strings.Trim(strings.TrimSpace(kv[1]), "\"'`")
				}
				if ukey != "" && !seenKeys[ukey] {
					seenKeys[ukey] = true
					envUsers = append(envUsers, User{
						ID:     "env_keys_" + strings.ToLower(uname),
						Name:   uname,
						Key:    ukey,
						Remark: "Khởi tạo từ biến môi trường DS2API_USER_KEYS",
					})
				}
			}
		}
	}

	return envUsers
}

func (s *Store) AddUser(u User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u.ID = strings.TrimSpace(u.ID)
	u.Key = strings.TrimSpace(u.Key)
	if u.Key == "" {
		return nil
	}
	for _, existing := range s.cfg.Users {
		if existing.ID == u.ID || existing.Key == u.Key {
			return nil
		}
	}
	s.cfg.Users = append(s.cfg.Users, u)
	return s.saveLocked()
}

func (s *Store) DeleteUser(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	id = strings.TrimSpace(id)
	newUsers := make([]User, 0, len(s.cfg.Users))
	for _, u := range s.cfg.Users {
		if u.ID != id {
			newUsers = append(newUsers, u)
		}
	}
	s.cfg.Users = newUsers
	return s.saveLocked()
}
