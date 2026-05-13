'use client'

import { useState, useEffect } from 'react'
import { Link2, Plus, Edit3, Trash2, Loader2, Check, X } from 'lucide-react'

interface FriendLinkItem {
  id: number
  name: string
  url: string
  description: string | null
  sortOrder: number
  enabled: boolean
}

export default function FriendLinkManager() {
  const [list, setList] = useState<FriendLinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<FriendLinkItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', description: '', sortOrder: 0 })
  const [saving, setSaving] = useState(false)

  const loadList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/friend-links')
      const data = await res.json()
      setList(data.links || [])
    } catch { setList([]) }
    setLoading(false)
  }

  useEffect(() => { loadList() }, [])

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await fetch(`/api/admin/friend-links/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/admin/friend-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setEditing(null)
      setShowAdd(false)
      setForm({ name: '', url: '', description: '', sortOrder: 0 })
      loadList()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条友情链接？')) return
    await fetch(`/api/admin/friend-links/${id}`, { method: 'DELETE' })
    loadList()
  }

  const handleToggle = async (item: FriendLinkItem) => {
    await fetch(`/api/admin/friend-links/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, enabled: !item.enabled }),
    })
    loadList()
  }

  const startEdit = (item: FriendLinkItem) => {
    setEditing(item)
    setForm({ name: item.name, url: item.url, description: item.description || '', sortOrder: item.sortOrder })
    setShowAdd(true)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', url: '', description: '', sortOrder: list.length })
    setShowAdd(true)
  }

  const isSame = editing && form.name === editing.name && form.url === editing.url &&
    form.description === (editing.description || '') && form.sortOrder === editing.sortOrder

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link2 className="w-6 h-6 text-primary-600" />
          <h3 className="text-xl font-bold text-gray-900">友情链接管理</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-sm rounded">{list.filter(i => i.enabled).length} 条启用</span>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" /> 添加链接
        </button>
      </div>

      {/* 表单 */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">网站名称</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="输入网站名称..."
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">网站地址</label>
                <input
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="网站简介..."
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
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
                disabled={!form.name.trim() || !form.url.trim() || (editing && isSame) || saving}
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
        <div className="text-center py-12 text-gray-500">暂无友情链接，点击上方添加</div>
      ) : (
        <div className="space-y-3">
          {list.sort((a, b) => a.sortOrder - b.sortOrder).map(item => (
            <div key={item.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${item.enabled ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}>
              {/* 网站名称 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${item.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{item.name}</span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline truncate">{item.url}</a>
                </div>
                <p className={`text-xs mt-0.5 ${item.enabled ? 'text-gray-400' : 'text-gray-300'}`}>
                  排序: {item.sortOrder} | ID: {item.id}
                  {item.description && ` | ${item.description}`}
                </p>
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
