import { clsx } from 'clsx'

export const cn = (...classes) => clsx(...classes)

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const generateId = () => Math.random().toString(36).substr(2, 9)

export const groupBy = (arr, key) => {
    return arr.reduce((groups, item) => {
        const group = item[key]
        if (!groups[group]) groups[group] = []
            groups[group].push(item)
            return groups
    }, {})
}

export const debounce = (fn, delay) => {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), delay)
    }
}

export const getInitials = (name) => {
    if (!name) return '?'
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const getAvatarColor = (name) => {
    const colors = [
        'bg-sky-500', 'bg-emerald-500', 'bg-violet-500',
        'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500'
    ]
    if (!name) return colors[0]
        const index = name.charCodeAt(0) % colors.length
        return colors[index]
}

export const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        return false
    }
}

export const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export const parseQueryString = (search) => {
    return Object.fromEntries(new URLSearchParams(search))
}

export const buildQueryString = (params) => {
    const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    return new URLSearchParams(filtered).toString()
}

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export const range = (start, end) => Array.from({ length: end - start }, (_, i) => start + i)
