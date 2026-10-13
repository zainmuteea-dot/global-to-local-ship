import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const db = supabase as any

type Product = {
  id: string
  name: string | null
  sku: string | null
  price: number | string | null
  store_id?: string | null
  store_name?: string | null
  store?: string | null
  [key: string]: unknown
}

type Store = {
  id: string
  name?: string | null
  [key: string]: unknown
}

type StoreFilter = 'all' | 'shein' | 'amazon'

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})

function getStoreKey(name: string): 'shein' | 'amazon' | 'other' {
  const value = name.toLowerCase().replace(/\s/g, '')

  if (
    value.includes('amazon') ||
    value.includes('أمازون') ||
    value.includes('امازون')
  ) {
    return 'amazon'
  }

  if (
    value.includes('shein') ||
    value.includes('شيإن') ||
    value.includes('شيان') ||
    value.includes('شيان')
  ) {
    return 'shein'
  }

  return 'other'
}

function BrandHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="/new-order" className="inline-flex items-center gap-2 rounded-md bg-[#00558c] px-4 py-3 font-bold text-white shadow-sm transition hover:bg-[#003f6b]">
          <span aria-hidden="true">←</span>
          اطلب الآن
        </a>

        <a href="/products" className="flex items-center gap-3 text-right">
          <span>
            <span className="block text-xl font-black text-[#004f87] sm:text-2xl">
              الشامل للتسوق
            </span>
            <span className="block text-[9px] font-bold tracking-[0.22em] text-[#004f87]">
              AL SHAMEL SHOPPING
            </span>
          </span>

          <span className="grid h-14 w-14 place-items-center rounded-lg bg-gradient-to-br from-sky-100 to-orange-100">
            <svg
              viewBox="0 0 48 48"
              className="h-9 w-9 text-[#00558c]"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 13h4l4 20h20l4-15H15"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="20" cy="39" r="2.5" fill="#f28c28" />
              <circle cx="34" cy="39" r="2.5" fill="#f28c28" />
              <path
                d="M20 20h16M20 25h13"
                stroke="#f28c28"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </a>
      </div>
    </header>
  )
}

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [storeId, setStoreId] = useState('')
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all')
  const [isAdding, setIsAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [routeReady, setRouteReady] = useState(false)
  const [productId, setProductId] = useState<string | null>(null)
  const [sharedProduct, setSharedProduct] = useState<Product | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [listError, setListError] = useState('')

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('productId')
    setProductId(id)
    setRouteReady(true)
  }, [])

  useEffect(() => {
    if (!routeReady) return

    const loadStores = async () => {
      const { data, error } = await db.from('stores').select('*')
      if (error) {
        console.error('تعذر تحميل المتاجر:', error)
        return
      }
      setStores((data ?? []) as Store[])
    }

    void loadStores()
  }, [routeReady])

  const fetchProducts = async () => {
    setListLoading(true)

    const { data, error } = await db
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    setListLoading(false)

    if (error) {
      console.error('تعذر تحميل المنتجات:', error)
      setListError('تعذر تحميل المنتجات. تحقق من الاتصال والصلاحيات.')
      return
    }

    setListError('')
    setProducts((data ?? []) as Product[])
  }

  useEffect(() => {
    if (!routeReady || productId) return
    void fetchProducts()
  }, [routeReady, productId])

  useEffect(() => {
    if (!routeReady || !productId) return

    let cancelled = false

    const loadSharedProduct = async () => {
      setDetailLoading(true)
      setDetailError('')
      setSharedProduct(null)

      const { data, error } = await db
        .from('products')
        .select('id, name, sku, price, store_id')
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

  const getStoreName = (product: Product) => {
    const store = stores.find((item) => item.id === product.store_id)
    return String(
      store?.name ||
        product.store_name ||
        product.store ||
        '',
    )
  }

  const getStoreSlug = (product: Product) => {
    const key = getStoreKey(getStoreName(product))
    return key === 'amazon' ? 'amazon' : 'shein'
  }

  const getProductUrl = (id: string) =>
    `${window.location.origin}/products?productId=${encodeURIComponent(id)}`

  const getOrderUrl = (product: Product) =>
    `/new-order?store=${getStoreSlug(product)}&productName=${encodeURIComponent(
      product.name || '',
    )}`

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
        await navigator.share({
          title: sharedProduct.name || 'منتج من الشامل للتسوق',
          url,
        })
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

  const addProduct = async () => {
    if (!name.trim()) {
      alert('أدخل اسم المنتج')
      return
    }

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
      alert('تعذرت إضافة المنتج. تحقق من البيانات والصلاحيات.')
      return
    }

    setName('')
    setSku('')
    setPrice('')
    setStoreId('')
    setShowAddForm(false)
    await fetchProducts()
  }

  const filteredProducts = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        !searchValue ||
        String(product.name || '').toLowerCase().includes(searchValue) ||
        String(product.sku || '').toLowerCase().includes(searchValue)

      const storeKey = getStoreKey(getStoreName(product))
      const matchesStore =
        storeFilter === 'all' ||
        (storeFilter === 'shein' && storeKey === 'shein') ||
        (storeFilter === 'amazon' && storeKey === 'amazon')

      return matchesSearch && matchesStore
    })
  }, [products, stores, search, storeFilter])

  if (!routeReady) {
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f3f7fb] p-6">
        جارٍ التحميل…
      </main>
    )
  }

  if (productId) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f3f7fb] text-slate-900">
        <BrandHeader />

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          {detailLoading ? (
            <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
              جارٍ تحميل المنتج…
            </section>
          ) : detailError ? (
            <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <h1 className="mb-2 text-xl font-bold">تعذر عرض المنتج</h1>
              <p className="text-slate-600">{detailError}</p>
              <a href="/products" className="mt-5 inline-block font-semibold text-[#00558c] underline">
                العودة إلى المنتجات
              </a>
            </section>
          ) : sharedProduct ? (
            <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="bg-gradient-to-l from-[#004f87] to-[#0873ae] p-8 text-white sm:p-10">
                <p className="mb-3 text-sm text-sky-100">منتج من الشامل للتسوق</p>
                <h1 className="text-3xl font-black">
                  {sharedProduct.name || 'منتج'}
                </h1>
                {sharedProduct.sku && (
                  <p className="mt-3 text-sm text-sky-100">
                    كود المنتج: {sharedProduct.sku}
                  </p>
                )}
              </div>

              <div className="p-6 sm:p-8">
                <p className="text-sm text-slate-500">السعر</p>
                <p className="mt-1 text-2xl font-extrabold text-[#004f87]">
                  {sharedProduct.price == null
                    ? 'غير محدد'
                    : Number(sharedProduct.price).toLocaleString('ar')}
                </p>

                <a
                  href={getOrderUrl(sharedProduct)}
                  className="mt-6 block w-full rounded-lg bg-[#00558c] px-5 py-3 text-center font-bold text-white transition hover:bg-[#003f6b]"
                >
                  اطلبه عبر الشامل
                </a>

                <button
                  type="button"
                  onClick={() => void shareProduct()}
                  className="mt-3 w-full rounded-lg border border-[#00558c] px-5 py-3 font-bold text-[#00558c] transition hover:bg-sky-50"
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
    <main dir="rtl" className="min-h-screen bg-white text-slate-900">
      <BrandHeader />

      <section className="bg-[#f3f7fb]">
        <div className="mx-auto max-w-6xl px-4 pb-5 pt-4 sm:px-6 sm:pb-7">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#00558c]">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            تشكيلة مختارة
          </div>

          <h1 className="text-4xl font-black tracking-tight text-[#003f6b] sm:text-5xl">
            المنتجات<span className="text-orange-500">.</span>
          </h1>

          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            منتجات مختارة من شي إن وأمازون، والشراء يتم عبر الشامل.
          </p>

          <div className="mt-7 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-500 sm:max-w-xs">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStoreFilter('all')}
                className={`rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
                  storeFilter === 'all'
                    ? 'border-[#00558c] bg-sky-50 text-[#00558c]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setStoreFilter('shein')}
                className={`rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
                  storeFilter === 'shein'
                    ? 'border-[#00558c] bg-sky-50 text-[#00558c]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                }`}
              >
                شي إن
              </button>
              <button
                type="button"
                onClick={() => setStoreFilter('amazon')}
                className={`rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
                  storeFilter === 'amazon'
                    ? 'border-[#00558c] bg-sky-50 text-[#00558c]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                }`}
              >
                أمازون
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">تصفح المنتجات</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredProducts.length} منتج
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="rounded-md border border-[#00558c] px-4 py-2.5 text-sm font-bold text-[#00558c] transition hover:bg-sky-50"
          >
            {showAddForm ? 'إغلاق نموذج الإضافة' : 'إضافة منتج'}
          </button>
        </div>

        {showAddForm && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-4 font-bold">إضافة منتج جديد</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="اسم المنتج"
                className="rounded-md border border-slate-200 bg-white p-3 outline-none focus:border-[#00558c]"
              />
              <input
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder="الكود"
                className="rounded-md border border-slate-200 bg-white p-3 outline-none focus:border-[#00558c]"
              />
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="السعر"
                type="number"
                min="0"
                className="rounded-md border border-slate-200 bg-white p-3 outline-none focus:border-[#00558c]"
              />
              <select
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                className="rounded-md border border-slate-200 bg-white p-3 outline-none focus:border-[#00558c]"
              >
                <option value="">اختر المتجر</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name || 'متجر'}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void addProduct()}
              disabled={isAdding}
              className="mt-4 rounded-md bg-[#00558c] px-5 py-2.5 font-bold text-white transition hover:bg-[#003f6b] disabled:opacity-60"
            >
              {isAdding ? 'جارٍ الإضافة…' : 'حفظ المنتج'}
            </button>
          </section>
        )}

        {listError && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">
            {listError}
          </p>
        )}

        {listLoading ? (
          <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-600">
            جارٍ تحميل المنتجات…
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-600">
            لا توجد منتجات مطابقة. أضف منتجًا أو جرّب تغيير البحث أو الفلتر.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid h-36 place-items-center bg-gradient-to-br from-sky-50 to-orange-50">
                  <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-[#00558c]">
                    الشامل للتسوق
                  </span>
                </div>

                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900">
                      {product.name || 'منتج بدون اسم'}
                    </h3>
                    <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                      {getStoreName(product) || 'منتج مختار'}
                    </span>
                  </div>

                  {product.sku && (
                    <p className="text-xs text-slate-500">الكود: {product.sku}</p>
                  )}

                  <p className="mt-3 text-lg font-extrabold text-[#004f87]">
                    {product.price == null
                      ? 'السعر عند الطلب'
                      : Number(product.price).toLocaleString('ar')}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <a
                      href={getProductUrl(String(product.id))}
                      className="rounded-md border border-[#00558c] px-3 py-2 text-center text-sm font-bold text-[#00558c] transition hover:bg-sky-50"
                    >
                      عرض المنتج
                    </a>
                    <a
                      href={getOrderUrl(product)}
                      className="rounded-md bg-[#00558c] px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-[#003f6b]"
                    >
                      اطلبه الآن
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => void copyProductLink(String(product.id))}
                    className="mt-2 w-full rounded-md px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[#00558c]"
                  >
                    نسخ رابط المنتج
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
