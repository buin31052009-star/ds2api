import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { Plus, Trash2, Copy, Check, Eye, EyeOff, Shield, Users, Key, ChevronDown, ChevronUp } from 'lucide-react'

export default function UserManagementContainer({ authFetch }) {
    const { t } = useI18n()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ name: '', remark: '', key: '' })
    const [submitting, setSubmitting] = useState(false)
    const [copiedKey, setCopiedKey] = useState('')
    const [visibleKeys, setVisibleKeys] = useState({})
    const [expandedUser, setExpandedUser] = useState(null)
    const [errorMsg, setErrorMsg] = useState('')

    const safeFetch = async (url, options = {}) => {
        if (authFetch) {
            return authFetch(url, options)
        }
        const token = localStorage.getItem('ds2api_token') || sessionStorage.getItem('ds2api_token')
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
        return fetch(url, { ...options, headers })
    }

    const safeFetchJson = async (url, options = {}) => {
        const res = await safeFetch(url, options)
        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
            throw new Error('Server đang cập nhật phiên bản mới. Vui lòng tải lại trang sau 30 giây.')
        }
        const data = await res.json()
        return { res, data }
    }

    const fetchUsers = async () => {
        setLoading(true)
        setErrorMsg('')
        try {
            const { res, data } = await safeFetchJson('/admin/users')
            if (res.ok) {
                setUsers(data.users || [])
            } else {
                setErrorMsg('Không thể tải danh sách người dùng. Chỉ Admin mới có quyền xem.')
            }
        } catch (e) {
            setErrorMsg(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const generateRandomKey = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        let rand = 'usr_'
        for (let i = 0; i < 16; i++) {
            rand += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setFormData(prev => ({ ...prev, key: rand }))
    }

    const handleAddUser = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const { res, data } = await safeFetchJson('/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (res.ok && data.success) {
                setShowModal(false)
                setFormData({ name: '', remark: '', key: '' })
                fetchUsers()
            } else {
                alert(data.detail || 'Không thể tạo User mới')
            }
        } catch (e) {
            alert('Thông báo: ' + e.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteUser = async (id, name) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa User "${name}"? Các tài khoản liên quan sẽ trở về dạng trực thuộc Admin.`)) return
        try {
            const { res } = await safeFetchJson(`/admin/users/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                fetchUsers()
            } else {
                alert('Xóa User thất bại')
            }
        } catch (e) {
            alert('Thông báo: ' + e.message)
        }
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        setCopiedKey(text)
        setTimeout(() => setCopiedKey(''), 2000)
    }

    const toggleKeyVisibility = (id) => {
        setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }))
    }

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/40 border border-border p-6 rounded-xl backdrop-blur-sm">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Users className="w-6 h-6 text-amber-500" />
                        Quản Lý Người Dùng (Admin Only)
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Tạo khóa bảo mật riêng cho từng bạn bè, quản lý người dùng và theo dõi Email / Mật khẩu DeepSeek mà từng người đã thêm.
                    </p>
                </div>
                <button
                    onClick={() => {
                        generateRandomKey()
                        setShowModal(true)
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-all shadow-lg shadow-amber-500/10 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Thêm User Mới
                </button>
            </div>

            {errorMsg && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                    {errorMsg}
                </div>
            )}

            {/* List Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">Đang tải danh sách người dùng...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground space-y-3">
                        <Key className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                        <p className="font-medium text-foreground">Chưa có người dùng nào được tạo.</p>
                        <p className="text-xs">Bấm nút "Thêm User Mới" bên trên để tạo khóa truy cập riêng cho bạn bè.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {users.map((u) => {
                            const isExpanded = expandedUser === u.id
                            const isVisible = visibleKeys[u.id]

                            return (
                                <div key={u.id} className="transition-colors hover:bg-muted/30">
                                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground text-base">{u.name}</span>
                                                {u.remark && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                                                        {u.remark}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                                <Key className="w-3.5 h-3.5 text-amber-500" />
                                                <span>User Key:</span>
                                                <span className="text-foreground bg-secondary/60 px-2 py-0.5 rounded border border-border/50">
                                                    {isVisible ? u.key : '••••••••••••••••••••'}
                                                </span>
                                                <button
                                                    onClick={() => toggleKeyVisibility(u.id)}
                                                    className="p-1 hover:text-foreground transition-colors"
                                                    title={isVisible ? 'Ẩn key' : 'Hiện key'}
                                                >
                                                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(u.key)}
                                                    className="p-1 hover:text-foreground transition-colors"
                                                    title="Sao chép User Key"
                                                >
                                                    {copiedKey === u.key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end md:self-center">
                                            <button
                                                onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground transition-colors"
                                            >
                                                <span>Tài khoản DeepSeek ({u.account_count || 0})</span>
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>

                                            <button
                                                onClick={() => handleDeleteUser(u.id, u.name)}
                                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                title="Xóa người dùng này"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Account details for Admin supervision */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 pt-2 bg-muted/20 border-t border-border/50">
                                            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3">
                                                Danh sách tài khoản DeepSeek do {u.name} thêm (Admin có thể xem Email & Mật khẩu):
                                            </h4>

                                            {(!u.accounts || u.accounts.length === 0) ? (
                                                <div className="text-xs text-muted-foreground italic py-2">
                                                    User này chưa thêm tài khoản DeepSeek nào.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto border border-border/60 rounded-lg bg-card">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-secondary/50 text-muted-foreground border-b border-border/60">
                                                            <tr>
                                                                <th className="p-2.5 font-medium">Tên hiển thị</th>
                                                                <th className="p-2.5 font-medium">Email DeepSeek</th>
                                                                <th className="p-2.5 font-medium">Mật khẩu DeepSeek</th>
                                                                <th className="p-2.5 font-medium">Ghi chú</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/40 font-mono">
                                                            {u.accounts.map((acc, idx) => (
                                                                <tr key={idx} className="hover:bg-muted/40">
                                                                    <td className="p-2.5 font-sans font-medium text-foreground">{acc.name || 'Tài khoản DeepSeek'}</td>
                                                                    <td className="p-2.5 text-emerald-400 font-semibold">{acc.email || acc.mobile || '-'}</td>
                                                                    <td className="p-2.5 text-amber-300 font-semibold">{acc.password || '-'}</td>
                                                                    <td className="p-2.5 text-muted-foreground font-sans">{acc.remark || '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal Add User */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Shield className="w-5 h-5 text-amber-500" />
                                Thêm User Mới
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">Tên bạn bè / User</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Bạn Hùng, Anh Nam..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">User Secret Key (Cấp cho người này)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ví dụ: usr_xxxx..."
                                        value={formData.key}
                                        onChange={e => setFormData({ ...formData, key: e.target.value })}
                                        className="w-full px-3 py-2 text-sm font-mono bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-amber-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={generateRandomKey}
                                        className="px-3 py-2 text-xs font-semibold bg-secondary hover:bg-muted border border-border rounded-lg text-foreground shrink-0"
                                    >
                                        Tạo lại
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">Ghi chú (tùy chọn)</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Cấp riêng cho team dev"
                                    value={formData.remark}
                                    onChange={e => setFormData({ ...formData, remark: e.target.value })}
                                    className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium bg-secondary hover:bg-muted text-foreground rounded-lg"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-black rounded-lg disabled:opacity-50"
                                >
                                    {submitting ? 'Đang tạo...' : 'Tạo User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
