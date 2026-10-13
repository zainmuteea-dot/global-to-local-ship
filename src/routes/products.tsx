import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const db = supabase as any

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})

function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [storeId, setStoreId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fetchData = async () => {
    const { data: productData, error: productError } = await db
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (productError) {
      console.error('تعذر تحميل المنتجات:', productError)
      alert('تعذر تحميل المنتجات. تحقق من اتصال قاعدة البيانات والصلاحيات.')
    } else {
      setProducts(productData ?? [])
    }

    const { data: storeData, error: storeError } = await db.from('stores').select('*')
    if (storeError) console.error('تعذر تحميل المخازن:', storeError)
    else setStores(storeData ?? [])
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const getProductUrl = (productId: string) => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/product/${encodeURIComponent(productId)}`
  }

  const copyProductLink = async (productId: string) => {
    const url = getProductUrl(productId)
    if (!url) return

    try {
      await navigator.clipboard.writeText(url)
      alert('تم نسخ رابط المنتج')
    } catch (error) {
      console.error('تعذر نسخ الرابط:', error)
      window.prompt('انسخ رابط المنتج:', url)
    }
  }

  const add = async () => {
    if (!name.trim()) return alert('أدخل اسم المنتج')

    setIsAdding(true)
    const { error } = await db.from('products').insert({
      name: name.trim(),
      sku: sku.trim() || null,
      price: Number(price) || 0,
      store_id: storeId || null,
    })
    setIsAdding(false)

    if (error) {
      console.error('تعذرت إضافة المنتج:', error)
      return alert('تعذرت إضافة المنتج. تحقق من البيانات والصلاحيات.')
    }

    setName('')
    setSku('')
    setPrice('')
    setStoreId('')
    await fetchData()
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f1dc] p-4 text-slate-900 sm:p-6">
      <h1 className="mb-4 text-2xl font-bold">المنتجات</h1>

      <section className="mb-5 flex flex-wrap gap-2 rounded-lg bg-white p-4 shadow">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="اسم المنتج"
          className="min-w-40 flex-1 rounded border p-2"
        />
        <input
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          placeholder="الكود"
          className="min-w-32 flex-1 rounded border p-2"
        />
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="السعر"
          type="number"
          min="0"
          className="min-w-32 flex-1 rounded border p-2"
        />
        <select
          value={storeId}
          onChange={(event) => setStoreId(event.target.value)}
          className="min-w-36 rounded border p-2"
        >
          <option value="">اختر المخزن</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={isAdding}
          className="rounded bg-blue-800 px-5 py-2 font-semibold text-white disabled:opacity-60"
        >
          {isAdding ? 'جارٍ الإضافة…' : 'إضافة'}
        </button>
      </section>

      <section className="grid gap-3">
        {products.length === 0 ? (
          <p className="rounded-lg bg-white p-4 text-slate-600">لا توجد منتجات لعرضها.</p>
        ) : (
          products.map((product) => (
            <article
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow"
            >
              <div>
                <h2 className="font-bold">{product.name || 'منتج بدون اسم'}</h2>
                <p className="text-sm text-slate-600">
                  {product.sku ? `الكود: ${product.sku} · ` : ''}السعر: {product.price ?? 0}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/product/${encodeURIComponent(String(product.id))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-blue-800 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  عرض الصفحة
                </a>
                <button
                  type="button"
                  onClick={() => void copyProductLink(String(product.id))}
                  className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900"
                >
                  نسخ الرابط
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}
