package users

import "github.com/go-chi/chi/v5"

func RegisterRoutes(r chi.Router, h *Handler) {
	r.Get("/users", h.listUsers)
	r.Post("/users", h.addUser)
	r.Delete("/users/{id}", h.deleteUser)

	r.Get("/api/admin/users", h.listUsers)
	r.Post("/api/admin/users", h.addUser)
	r.Delete("/api/admin/users/{id}", h.deleteUser)
}
