import { useCallback, useEffect, useMemo, useState } from 'react'
import { detectRuntimeEnv } from '../utils/runtimeEnv'

export function useAdminAuth({ location, t }) {
    const [message, setMessage] = useState(null)
    const [token, setToken] = useState(null)
    const [authChecking, setAuthChecking] = useState(true)

    const runtimeEnv = useMemo(() => detectRuntimeEnv(), [])
    const isVercel = runtimeEnv.isVercel

    const showMessage = useCallback((type, text) => {
        setMessage({ type, text })
        setTimeout(() => setMessage(null), 5000)
    }, [])

    const handleLogout = useCallback(() => {
        setToken(null)
        localStorage.removeItem('ds2api_token')
        localStorage.removeItem('ds2api_token_expires')
        localStorage.removeItem('ds2api_user_role')
        sessionStorage.removeItem('ds2api_token')
        sessionStorage.removeItem('ds2api_token_expires')
        sessionStorage.removeItem('ds2api_user_role')
    }, [])

    const handleLogin = useCallback((newToken) => {
        setToken(newToken)
    }, [])

    useEffect(() => {
        let timer = setTimeout(() => {
            setAuthChecking(false)
        }, 2000)

        const checkAuth = async () => {
            const storedToken = localStorage.getItem('ds2api_token') || sessionStorage.getItem('ds2api_token')
            const expiresAt = parseInt(localStorage.getItem('ds2api_token_expires') || sessionStorage.getItem('ds2api_token_expires') || '0')

            if (storedToken && expiresAt > Date.now()) {
                try {
                    const res = await fetch('/admin/verify', {
                        headers: { 'Authorization': `Bearer ${storedToken}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data.role) {
                            localStorage.setItem('ds2api_user_role', data.role)
                        }
                        setToken(storedToken)
                    } else {
                        handleLogout()
                    }
                } catch {
                    setToken(storedToken)
                }
            } else {
                handleLogout()
            }
            clearTimeout(timer)
            setAuthChecking(false)
        }

        checkAuth().catch(() => {
            clearTimeout(timer)
            setAuthChecking(false)
        })

        return () => clearTimeout(timer)
    }, [handleLogout, t])

    return {
        token,
        authChecking,
        message,
        isVercel,
        showMessage,
        handleLogin,
        handleLogout,
    }
}
