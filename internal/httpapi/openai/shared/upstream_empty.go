package shared

import (
	"net/http"
	"strings"
)

func ShouldWriteUpstreamEmptyOutputError(text, thinking string) bool {
	return strings.TrimSpace(text) == ""
}

func UpstreamEmptyOutputDetail(contentFilter bool, text, thinking string) (int, string, string) {
	_ = text
	if contentFilter {
		return http.StatusBadRequest, "Nội dung phản hồi bị bộ lọc DeepSeek chặn (Content Filter).", "content_filter"
	}
	if thinking != "" {
		return http.StatusTooManyRequests, "Tài khoản DeepSeek đạt giới hạn lượt dùng trong thời gian ngắn. Vui lòng thử lại sau ít phút.", "upstream_empty_output"
	}
	return http.StatusServiceUnavailable, "Chưa có tài khoản DeepSeek nào khả dụng hoặc tài khoản chưa đăng nhập. Vui lòng vào mục 'Quản lý Tài khoản' để thêm Email/Mật khẩu DeepSeek.", "upstream_unavailable"
}

func WriteUpstreamEmptyOutputError(w http.ResponseWriter, text, thinking string, contentFilter bool) bool {
	if !ShouldWriteUpstreamEmptyOutputError(text, thinking) {
		return false
	}
	status, message, code := UpstreamEmptyOutputDetail(contentFilter, text, thinking)
	WriteOpenAIErrorWithCode(w, status, message, code)
	return true
}
