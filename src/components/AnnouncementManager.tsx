'use client'

import { useState, useEffect } from 'react'
import { Megaphone, Plus, Edit3, Trash2, ExternalLink, Loader2, Check, X } from 'lucide-react'

interface AnnouncementItem {
  id: number
  text: string
  type: string
  enabled: boolean
  sortOrder: number
}

const TYPE_OPTIONS = [
  { value: 'info', label: '资讯', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { value: 'update', label: '更新', color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'event', label: '活动', color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { value: 'notice', label: '公告', color: 'text-amber-600 bg-amber-50 border-amber-200' },
]

export default function AnnouncementManager() {
  const [list, setList] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AnnouncementItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ text: '', type: 'info', enabled: true, sortOrder: 0 })
  const [saving, setSaving] = useState(false)

  const loadList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcements')
      const data = await res.json()
      setList(data.announcements || [])
    } catch { setList([]) }
    setLoading(false)
  }

  useEffect(() => { loadList() }, [])

  const handleSave = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await fetch(`/api/admin/announcements/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setEditing(null)
      setShowAdd(false)
      setForm({ text: '', type: 'info', enabled: true, sortOrder: 0 })
      loadList()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条公告？')) return
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    loadList()
  }

  const handleToggle = async (item: AnnouncementItem) => {
    await fetch(`/api/admin/announcements/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, enabled: !item.enabled }),
    })
    loadList()
  }

  const startEdit = (item: AnnouncementItem) => {
    setEditing(item)
    setForm({ text: item.text, type: item.type, enabled: item.enabled, sortOrder: item.sortOrder })
    setShowAdd(true)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ text: '', type: 'info', enabled: true, sortOrder: list.length })
    setShowAdd(true)
  }

  const isSame = editing && form.text === editing.text && form.type === editing.type && form.enabled === editing.enabled

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary-600" />
          <h3 className="text-xl font-bold text-gray-900">网站公告管理</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-sm rounded">{list.filter(i => i.enabled).length} 条启用</span>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" /> 添加公告
        </button>
      </div>

      {/* 表单 */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公告内容</label>
              <textarea
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder="输入公告内容..."
                className="w-full h-20 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                >
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-600">启用</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowAdd(false); setEditing(null) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!form.text.trim() || (editing && isSame) || saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editing ? '保存修改' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无公告，点击上方添加</div>
      ) : (
        <div className="space-y-3">
          {list.map(item => (
            <div key={item.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${item.enabled ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}>
              {/* 类型标签 */}
              <span className={`flex-shrink-0 px-2 py-1 text-xs font-bold rounded border ${TYPE_OPTIONS.find(o => o.value === item.type)?.color || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                {TYPE_OPTIONS.find(o => o.value === item.type)?.label || item.type}
              </span>
              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.enabled ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{item.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">排序: {item.sortOrder} | ID: {item.id}</p>
              </div>
              {/* 状态 */}
              <button
                onClick={() => handleToggle(item)}
                className={`flex-shrink-0 px-3 py-1 text-xs rounded-full border ${
                  item.enabled
                    ? 'text-green-700 border-green-300 bg-green-50 hover:bg-green-100'
                    : 'text-red-500 border-red-200 bg-red-50 hover:bg-red-100'
                } transition-colors`}
              >
                {item.enabled ? '已启用' : '已禁用'}
              </button>
              {/* 操作 */}
              <button onClick={() => startEdit(item)} className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="编辑">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(item.id)} className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
