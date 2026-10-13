import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const db = supabase as any

type Product = {
  id: string
  name: string | null
  sku: string | null
  price: number | string | null
  [key: string]: unknown
}

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [storeId, setStoreId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const [routeReady, setRouteReady] = useState(false)
  const [productId, setProductId] = useState<string | null>(null)
  const [sharedProduct, setSharedProduct] = useState<Product | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [listError, setListError] = useState('')

  // Reuse the existing /products route with a query parameter, so no new
  // generated TanStack route is needed: /products?productId=<id>.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('productId')
    setProductId(id)
    setRouteReady(true)
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await db
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('تعذر تحميل المنتجات:', error)
      setListError('تعذر تحميل المنتجات. تحقق من الاتصال والصلاحيات.')
      return
    }

    setListError('')
    setProducts((data ?? []) as Product[])

    const { data: storeData, error: storeError } = await db.from('stores').select('*')
    if (storeError) console.error('تعذر تحميل المخازن:', storeError)
    else setStores(storeData ?? [])
  }

  useEffect(() => {
    if (!routeReady) return

    if (!productId) {
      void fetchProducts()
      return
    }

    let cancelled = false
    const loadSharedProduct = async () => {
      setDetailLoading(true)
      setDetailError('')
      setSharedProduct(null)

      const { data, error } = await db
        .from('products')
        .select('id, name, sku, price')
        .eq('id', productId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        console.error('تعذر تحميل المنتج:', error)
        setDetailError('تعذر تحميل المنتج. قد لا تسمح صلاحيات قاعدة البيانات بالعرض العام.')
      } else if (!data) {
        setDetailError('لم يتم العثور على المنتج. تحقق من الرابط.')
      } else {
        setSharedProduct(data as Product)
      }
      setDetailLoading(false)
    }

    void loadSharedProduct()
    return () => {
      cancelled = true
    }
  }, [routeReady, productId])

  const getProductUrl = (id: string) =>
    `${window.location.origin}/products?productId=${encodeURIComponent(id)}`

  const copyProductLink = async (id: string) => {
    const url = getProductUrl(id)
    try {
      await navigator.clipboard.writeText(url)
      alert('تم نسخ رابط المنتج')
    } catch (error) {
      console.error('تعذر نسخ الرابط:', error)
      window.prompt('انسخ رابط المنتج:', url)
    }
  }

  const shareProduct = async () => {
    if (!sharedProduct) return
    const url = getProductUrl(sharedProduct.id)
    try {
      if (navigator.share) {
        await navigator.share({ title: sharedProduct.name || 'منتج من السوق الشامل', url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('تم نسخ رابط المنتج')
      }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url)
        alert('تم نسخ رابط المنتج')
      } catch {
        window.prompt('انسخ رابط المنتج:', url)
      }
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
    await fetchProducts()
  }

  if (!routeReady) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f8f1dc] p-6">
        جارٍ التحميل…
      </main>
    )
  }

  if (productId) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f1dc] px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-xl">
          <a href="/" className="mb-5 inline-block font-semibold text-blue-800 hover:underline">
            السوق الشامل
          </a>
          {detailLoading ? (
            <section className="rounded-2xl bg-white p-8 text-center shadow">جارٍ تحميل المنتج…</section>
          ) : detailError ? (
            <section className="rounded-2xl bg-white p-8 text-center shadow">
              <h1 className="mb-2 text-xl font-bold">تعذر عرض المنتج</h1>
              <p className="text-slate-600">{detailError}</p>
              <a href="/products" className="mt-5 inline-block text-blue-800 underline">
                العودة
              </a>
            </section>
          ) : sharedProduct ? (
            <article className="overflow-hidden rounded-2xl bg-white shadow-lg">
              <header className="bg-gradient-to-l from-blue-900 to-blue-700 p-8 text-white">
                <p className="mb-2 text-sm text-blue-100">منتج من السوق الشامل</p>
                <h1 className="text-3xl font-black">{sharedProduct.name || 'منتج'}</h1>
                {sharedProduct.sku && (
                  <p className="mt-2 text-sm text-blue-100">كود المنتج: {sharedProduct.sku}</p>
                )}
              </header>
              <div className="p-6">
                <p className="text-sm text-slate-500">السعر</p>
                <p className="mt-1 text-2xl font-extrabold text-blue-900">
                  {sharedProduct.price == null
                    ? 'غير محدد'
                    : Number(sharedProduct.price).toLocaleString('ar')}
                </p>
                <button
                  type="button"
                  onClick={() => void shareProduct()}
                  className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600"
                >
                  مشاركة رابط المنتج
                </button>
              </div>
            </article>
          ) : null}
        </div>
      </main>
    )
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

      {listError && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-800">{listError}</p>}
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
                  href={getProductUrl(String(product.id))}
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
