import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const db = supabase as any

type PublicProduct = {
  id: string
  name: string | null
  sku: string | null
  price: number | string | null
}

export const Route = createFileRoute('/product/$productId' as any)({
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { productId } = Route.useParams() as { productId: string }
  const [product, setProduct] = useState<PublicProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let isCurrent = true

    const loadProduct = async () => {
      setLoading(true)
      setLoadError(false)

      const { data, error } = await db
        .from('products')
        .select('id, name, sku, price')
        .eq('id', productId)
        .maybeSingle()

      if (!isCurrent) return

      if (error) {
        console.error('تعذر تحميل المنتج:', error)
        setLoadError(true)
        setProduct(null)
      } else {
        setProduct(data as PublicProduct | null)
      }
      setLoading(false)
    }

    void loadProduct()
    return () => {
      isCurrent = false
    }
  }, [productId])

  const shareProduct = async () => {
    const url = window.location.href
    const title = product?.name || 'منتج من السوق الشامل'

    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('تم نسخ رابط المنتج')
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url)
          alert('تم نسخ رابط المنتج')
        } catch {
          window.prompt('انسخ رابط المنتج:', url)
        }
      }
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f1dc] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl">
        <a href="/" className="mb-6 inline-block text-sm font-semibold text-blue-800 hover:underline">
          السوق الشامل
        </a>

        {loading ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow">
            <p>جارٍ تحميل المنتج…</p>
          </section>
        ) : loadError ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow">
            <h1 className="mb-2 text-xl font-bold">تعذر تحميل المنتج</h1>
            <p className="text-slate-600">قد تكون صلاحية العرض العام غير مفعّلة أو يوجد خلل في الاتصال.</p>
          </section>
        ) : !product ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow">
            <h1 className="mb-2 text-xl font-bold">المنتج غير موجود</h1>
            <p className="text-slate-600">تحقق من الرابط أو اطلب رابطًا محدثًا من المتجر.</p>
          </section>
        ) : (
          <article className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="bg-gradient-to-l from-blue-900 to-blue-700 p-8 text-white">
              <p className="mb-2 text-sm text-blue-100">منتج من السوق الشامل</p>
              <h1 className="text-3xl font-black">{product.name || 'منتج'}</h1>
              {product.sku && <p className="mt-2 text-sm text-blue-100">كود المنتج: {product.sku}</p>}
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500">السعر</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-900">
                {product.price == null ? 'غير محدد' : Number(product.price).toLocaleString('ar')}
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
        )}
      </div>
    </main>
  )
}
