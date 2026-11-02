import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const playTone = (frequency: number) => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // تجاهل منع المتصفح لتشغيل الصوت.
  }
};

const playPhoneNotificationSound = () => playTone(880);
const playDismissClickSound = () => playTone(520);
import {
  ShoppingBag,
  Search,
  ShoppingCart,
  Heart,
  Star,
  Tag,
  Percent,
  Truck,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Sparkles,
  ArrowLeft,
  X,
  Plus,
  Minus,
  MessageCircle,
  CreditCard,
  Building,
  Wallet,
  Coins,
  ChevronLeft,
  Filter,
  CheckCircle2,
  DollarSign,
  Calculator,
  RotateCcw,
} from "lucide-react";

// =========================================================================
// 🌟 أنواع البيانات لصفحة المنتجات وبوابات الشراء الست
// =========================================================================
export interface ProductItem {
  id: string;
  store: "SHEIN" | "Amazon" | "Alibaba" | "Discounts" | "AliExpress" | "Trendyol" | "الشامل";
  sku?: string;
  quantity?: number;
  inventoryProduct?: boolean;
  title: string;
  category: string;
  priceSAR: number;
  oldPriceSAR?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  badge?: string;
  inStock: boolean;
  features?: string[];
}

export interface StorePlatform {
  id: string;
  externalUrl?: string;
  code: string;
  name: string;
  englishName: string;
  badge: string;
  badgeColor: string;
  discountTag: string;
  couponCode: string;
  image: string;
  orderCount: string;
  features: string[];
}

type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  store_id: string | null;
  quantity: number | null;
  sell_price: number | null;
  created_at: string | null;
};

type StorefrontProduct = {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  site_name: string;
};

interface ProductsRouteProps {
  onBack?: () => void;
  onNavigateToOrder?: (storeCode?: string, productName?: string) => void;
  onNavigateToTracker?: () => void;
  onNavigateToAdmin?: () => void;
}

export const ProductsPage: React.FC<ProductsRouteProps> = ({
  onBack,
  onNavigateToOrder,
  onNavigateToTracker,
  onNavigateToAdmin,
}) => {
  // Navigation & Search States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<
    "SAR" | "YER_SANAA" | "YER_ADEN" | "USD"
  >("SAR");

  // Quick Amount Adjuster & Order Modal State
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<ProductItem | null>(null);
  const [orderAmountSAR, setOrderAmountSAR] = useState<number>(100);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [paymentSplit, setPaymentSplit] = useState<"half" | "full">("half");
  const [paymentMethod, setPaymentMethod] = useState<string>("كريمي");
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<{ product: ProductItem; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const goToOrder = (storeCode?: string, productName?: string) => {
    if (onNavigateToOrder) {
      onNavigateToOrder(storeCode, productName);
      return;
    }

    const params = new URLSearchParams();
    if (storeCode) params.set("store", storeCode);
    if (productName) params.set("productName", productName);
    const query = params.toString();
    window.location.assign(`/new-order${query ? `?${query}` : ""}`);
  };

  type CatalogProduct = {
    id: string;
    name: string;
    sku: string | null;
    store_id: string | null;
    quantity: number | null;
    sell_price: number | null;
    created_at: string | null;
  };

  const [customerStoreUrls, setCustomerStoreUrls] = useState<Record<string, string>>({});
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("your-global-shopper.admin-logos.v1");
      const parsed: unknown = saved ? JSON.parse(saved) : null;
      if (!Array.isArray(parsed)) return;
      const urls = Object.fromEntries(
        parsed
          .filter((item): item is { slug: string; customerUrl?: string } => Boolean(item && typeof item === "object" && "slug" in item && typeof item.slug === "string"))
          .filter((item) => typeof item.customerUrl === "string" && /^https:\/\//i.test(item.customerUrl))
          .map((item) => [item.slug, item.customerUrl as string]),
      );
      setCustomerStoreUrls(urls);
    } catch {
      setCustomerStoreUrls({});
    }
  }, []);
  const [storefrontProducts, setStorefrontProducts] = useState<StorefrontProduct[]>([]);
  const [catalogError, setCatalogError] = useState("");

  const loadCatalogProducts = useCallback(async () => {
    const [{ data, error }, { data: managed, error: managedError }] = await Promise.all([
      db.from("products").select("id,name,sku,store_id,quantity,sell_price,created_at").order("created_at", { ascending: false }),
      db.from("storefront_products").select("id,name,price,image_url,storefront_sites!inner(name)").eq("is_active", true).order("sort_order", { ascending: true }),
    ]);
    if (error) {
      setCatalogError(`تعذر تحميل المنتجات المحفوظة: ${error.message}`);
    } else {
      setCatalogProducts((data ?? []) as CatalogProduct[]);
    }
    if (managedError) {
      setCatalogError((current) => current || `تعذر تحميل منتجات المواقع: ${managedError.message}`);
    } else {
      setStorefrontProducts((managed ?? []).map((item: any) => ({
        id: `managed-${item.id}`,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        site_name: item.storefront_sites?.name ?? "متجر",
      })));
    }
  }, []);

  useEffect(() => {
    void loadCatalogProducts();
  }, [loadCatalogProducts]);

  // أسعار الصرف التقريبية في السوق اليمني
  const exchangeRates = {
    SAR: 1,
    YER_SANAA: 140, // 1 ر.س = 140 ر.ي (صنعاء)
    YER_ADEN: 535, // 1 ر.س = 535 ر.ي (عدن)
    USD: 0.27, // 1 ر.س = 0.27 دولار
  };

  const formatPrice = (amountSAR: number, currency = selectedCurrency) => {
    const rate = exchangeRates[currency];
    const val = amountSAR * rate;
    if (currency === "USD") return `$${val.toFixed(2)}`;
    if (currency === "SAR") return `${Math.round(val)} ر.س`;
    return `${Math.round(val).toLocaleString()} ر.ي`;
  };

  // =========================================================================
  // 🌟 البطائق الست الرئيسية للمتاجر العالمية (حسب طلب العميل)
  // 1. شي إن | 2. أمازون | 3. علي بابا | 4. خصومات 50% | 5. علي إكسبريس | 6. ترينديول
  // =========================================================================
  const sixPlatforms: StorePlatform[] = [
  {
    id: "plat-1-shein",
    externalUrl: "https://ar.shein.com",
    code: "SHEIN",
      name: "شي إن - SHEIN",
      englishName: "Fashion & Style",
      badge: "الوسيط رقم #1 في اليمن 👑",
      badgeColor: "bg-slate-900 text-white",
      discountTag: "كوبون خصم 20%",
      couponCode: "SHEIN20",
      image:
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80",
      orderCount: "38,400+ طلب مشحون",
      features: ["تجميع طلبات ذكي", "فحص المقاس والجودة", "شحن جوي سريع"],
    },
    {
      id: "plat-2-amazon",
      code: "Amazon",
      name: "أمازون - Amazon",
      englishName: "Prime Tech & Brands",
      badge: "أصلي 100% ومضمون 🛡️",
      badgeColor: "bg-amber-400 text-slate-950",
      discountTag: "أسعار أمازون برايم",
      couponCode: "AMZ-PRIME",
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
      orderCount: "24,100+ طلب منجز",
      features: ["تغليف أصلي ضد الكسر", "إلكترونيات وعطور أصلية", "تتبع شحنة مبا��ر"],
    },
    {
      id: "plat-3-alibaba",
      code: "Alibaba",
      name: "علي بابا - Alibaba",
      englishName: "Wholesale & Factories",
      badge: "استيراد بأسعار المصانع 🏭",
      badgeColor: "bg-orange-600 text-white",
      discountTag: "أسعار الجملة للتجار",
      couponCode: "ALI-BABA",
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
      orderCount: "12,900+ شحنة تجارية",
      features: ["شحن حاويات بحري وجوي", "تجميع بمستودع كوانزو", "تخليص جمركي متكامل"],
    },
    {
      id: "plat-4-discounts",
      code: "Discounts",
      name: "خصومات وتصفيات 50%",
      englishName: "Mega 50% OFF Sale",
      badge: "عروض نصف السعر 🔥",
      badgeColor: "bg-rose-600 text-white animate-pulse",
      discountTag: "خصم حقيقي 50%",
      couponCode: "SAVE50",
      image:
        "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
      orderCount: "45,800+ كوبون مستخدم",
      features: ["تطبيق كود الخصم الأقوى", "اقتناص السعر الأرخص", "توفير نصف القيمة"],
    },
    {
      id: "plat-5-aliexpress",
      externalUrl: "https://www.aliexpress.com",
      code: "AliExpress",
      name: "علي إكسبريس - AliExpress",
      englishName: "Retail Factory Prices",
      badge: "ملايين السلع بسعر التكلفة ⚡",
      badgeColor: "bg-red-600 text-white",
      discountTag: "شراء قطاعي واقتصادي",
      couponCode: "ALI-EXPRESS",
      image:
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80",
      orderCount: "31,700+ طلب قطاعي",
      features: ["شحن اقتصادي مجمع", "ابتكارات ذكية وأدوات", "سعر المصنع بالقطعة"],
    },
    {
      id: "plat-6-trendyol",
      code: "Trendyol",
      name: "ترينديول ومواقع العالم",
      englishName: "Global Brands & Turkish Fashion",
      badge: "أي موقع بالعالم نشتري منه 🌍",
      badgeColor: "bg-indigo-600 text-white",
      discountTag: "ماركات تركية وعالمية",
      couponCode: "GLOBAL-SHIP",
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
      orderCount: "19,300+ طلب عالمي",
      features: ["شراء من أي رابط دولي", "قطنيات فاخرة ومكملات", "توصيل لباب بيتك"],
    },
  ];

  // =========================================================================
  // 🌟 منتجات الكتالوج المتنوعة الجاهزة للطلب السريع
  // =========================================================================
  const initialProducts: ProductItem[] = [
    {
      id: "p-1",
      store: "SHEIN",
      title: "فستان سهرة فرنسي فاخر بتطريز لؤلؤي راقي",
      category: "أزياء نسائية",
      priceSAR: 120,
      oldPriceSAR: 180,
      rating: 4.9,
      reviewsCount: 340,
      image:
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80",
      badge: "الأكثر طلباً 🔥",
      inStock: true,
      features: ["خامة عالية الجودة", "مقاسات دقيقة", "شحن مجاني"],
    },
    {
      id: "p-2",
      store: "SHEIN",
      title: "طقم أطفال قطني مريح للمناسبات والأعياد",
      category: "أطفال ورضع",
      priceSAR: 65,
      oldPriceSAR: 95,
      rating: 4.8,
      reviewsCount: 215,
      image:
        "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&auto=format&fit=crop&q=80",
      badge: "خصم 30%",
      inStock: true,
      features: ["قطن 100%", "مريح ولطيف", "غسيل يدوي وآلي"],
    },
    {
      id: "p-3",
      store: "Amazon",
      title: "سماعات بلوتوث لاسلكية عازلة للضوضاء برو ANC",
      category: "إلكترونيات",
      priceSAR: 195,
      oldPriceSAR: 290,
      rating: 4.9,
      reviewsCount: 1420,
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
      badge: "أصلي 100% 🛡️",
      inStock: true,
      features: ["بطارية تدوم 40 ساعة", "شحن سريع Type-C", "ضمان استبدال"],
    },
    {
      id: "p-4",
      store: "Amazon",
      title: "ساعة ذكية لمتابعة اللياقة والنبض وشاشة AMOLED",
      category: "ساعات وأجهزة",
      priceSAR: 145,
      oldPriceSAR: 220,
      rating: 4.7,
      reviewsCount: 880,
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      badge: "أمازون برايم",
      inStock: true,
      features: ["مقاومة للماء IP68", "تدعم اللغة العربية", "إشعارات المكالمات"],
    },
    {
      id: "p-5",
      store: "Alibaba",
      title: "كرتون كابلات شحن سريع بالجملة (100 حبة للمحلات)",
      category: "تجارة وجملة",
      priceSAR: 320,
      oldPriceSAR: 480,
      rating: 4.9,
      reviewsCount: 190,
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80",
      badge: "سعر المصنع 🏭",
      inStock: true,
      features: ["شحن سريع 65W", "جودة تجارية موثوقة", "تغليف بيع بالتجزئة"],
    },
    {
      id: "p-6",
      store: "Discounts",
      title: "حقيبة يد جلدية كلاسيكية مع محفظة يد نسائية فاخرة",
      category: "حقائب وإكسسوارات",
      priceSAR: 85,
      oldPriceSAR: 170,
      rating: 4.8,
      reviewsCount: 412,
      image:
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80",
      badge: "نصف السعر 50% 🔥",
      inStock: true,
      features: ["جلد صناعي فاخر", "سعة واسعة", "ألوان متناسقة"],
    },
    {
      id: "p-7",
      store: "AliExpress",
      title: "جهاز مساج الرقبة والظهر الذكي المحمول بالحرارة",
      category: "صحة وعناية",
      priceSAR: 75,
      oldPriceSAR: 125,
      rating: 4.6,
      reviewsCount: 650,
      image:
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80",
      badge: "ترند تيك توك ⚡",
      inStock: true,
      features: ["3 مستويات تدليك", "تسخين حراري مهدئ", "شحن USB"],
    },
    {
      id: "p-8",
      store: "Trendyol",
      title: "عباية تركية قطنية راقية بتطريز يدوي أنيق",
      category: "أزياء تركية",
      priceSAR: 160,
      oldPriceSAR: 230,
      rating: 4.9,
      reviewsCount: 290,
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80",
      badge: "صنع في تركيا 🇹🇷",
      inStock: true,
      features: ["قطن تركي أصلي", "قصة واسعة مريحة", "طرحة متناسقة مجاناً"],
    },
  ];

  // تصفية المنتجات حسب البحث والمتجر والفئة
  const filteredProducts = useMemo(() => {
    const managedProducts: ProductItem[] = storefrontProducts.map((product) => ({
      id: product.id,
      store: "الشامل",
      title: product.name,
      category: product.site_name,
      priceSAR: Number(product.price ?? 0),
      rating: 5,
      reviewsCount: 0,
      image: product.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      badge: `من ${product.site_name}`,
      inStock: true,
    }));

    const savedProducts: ProductItem[] = catalogProducts.map((product) => ({
      id: product.id,
      store: "الشامل",
      title: product.name,
      category: "منتجات الشامل",
      priceSAR: Number(product.sell_price ?? 0),
      rating: 0,
      reviewsCount: 0,
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80",
      badge: Number(product.quantity ?? 0) > 0 ? "متوفر" : "غير متوفر",
      inStock: Number(product.quantity ?? 0) > 0,
      ...(product.sku ? { sku: product.sku } : {}),
      quantity: Number(product.quantity ?? 0),
      inventoryProduct: true,
    }));

    return [...managedProducts, ...savedProducts, ...initialProducts].filter((p) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStore = selectedStoreFilter === "all" || p.store === selectedStoreFilter;
      const matchCategory = selectedCategory === "all" || p.category === selectedCategory;
      return matchSearch && matchStore && matchCategory;
    });
  }, [catalogProducts, storefrontProducts, searchQuery, selectedStoreFilter, selectedCategory]);

  const categoriesList = [
    "all",
    "أزياء نسائية",
    "إلكترونيات",
    "أطفال ورضع",
    "ساعات وأجهزة",
    "تجارة وجملة",
    "حقائب وإكسسوارات",
    "صحة وعناية",
    "أزياء تركية",
  ];

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    playPhoneNotificationSound();
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  const handleCopyAccountNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedAccount(num);
    playPhoneNotificationSound();
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const handleOpenOrderModal = (product: ProductItem) => {
    playDismissClickSound();
    setSelectedProductForOrder(product);
    setOrderAmountSAR(product.priceSAR);
    setOrderQuantity(1);
    setPaymentSplit("half");
  };

  const handleAddToCart = (product: ProductItem) => {
    playPhoneNotificationSound();
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const cartTotalSAR = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.priceSAR * item.quantity, 0);
  }, [cartItems]);

  const handleSendWhatsAppOrder = () => {
    if (!selectedProductForOrder) return;
    const totalSAR = orderAmountSAR * orderQuantity;
    const dueNowSAR = paymentSplit === "half" ? Math.ceil(totalSAR * 0.5) : totalSAR;
    const remainingSAR = paymentSplit === "half" ? Math.floor(totalSAR * 0.5) : 0;

    const message =
      `السلام عليكم، أرغب بطلب شراء السلعة التالية عبر *الشامل للتسوق*:\n` +
      `▪️ اسم المنتج: ${selectedProductForOrder.title}\n` +
      `▪️ المتجر المعتمد: ${selectedProductForOrder.store}\n` +
      `▪️ الكمية: ${orderQuantity}\n` +
      `▪️ الإجمالي: ${totalSAR} ر.س (${formatPrice(totalSAR)})\n` +
      `▪️ نظام السداد: ${paymentSplit === "half" ? "عربون 50% مقدم والباقي عند الاستلام" : "سداد كامل 100%"}\n` +
      `▪️ المبلغ المطلوب تحويله الآن: ${dueNowSAR} ر.س (${formatPrice(dueNowSAR)})\n` +
      (remainingSAR > 0 ? `▪️ المبلغ المتبقي عند الاستلام: ${remainingSAR} ر.س\n` : "") +
      `▪️ طريقة الدفع المختارة: ${paymentMethod}\n\nيرجى تأكيد الحساب للتحويل والمباشرة بالطلب. شكراً!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/967773370041?text=${encoded}`, "_blank");
  };

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#005696] selection:text-white pb-24"
      dir="rtl"
    >
      {/* 🌟 1. رأس الصفحة الرسمي */}
      <header className="border-b border-slate-200 bg-white px-3 py-3 sm:px-6" dir="rtl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <a
            href="/products"
            className="flex items-center gap-2.5"
            aria-label="الشامل للتسوق - الصفحة الرئيسية"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-[#005696]">
              <ShoppingCart className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-black text-[#005696] sm:text-xl">
                الشامل للتسوق
              </span>
              <span className="block text-[9px] font-bold tracking-[0.2em] text-[#005696]">
                AL SHAMEL SHOPPING
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            {onNavigateToTracker && (
              <button
                type="button"
                onClick={onNavigateToTracker}
                className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-flex"
              >
                تتبع الطلب
              </button>
            )}
            {onNavigateToAdmin && (
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 sm:inline-flex"
              >
                الإدارة
              </button>
            )}
            <button
              type="button"
              onClick={() => goToOrder("SHEIN")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#005696] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#0F4C81]"
            >
              اطلب الآن <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 🌟 2. شريط البحث والعملة وأزرار الفلترة السريعة */}
      <section className="bg-white border-b border-slate-200/90 px-3 sm:px-6 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* خانة البحث السريع */}
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج، متجر، أو فئة معينة..."
              className="w-full pr-9 pl-8 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#005696] focus:ring-2 focus:ring-[#005696]/15 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* محول العملات وسلة المشتريات */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* اختيار العملة */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <span className="text-[11px] text-slate-500 px-1">العملة:</span>
              {[
                { id: "SAR", label: "ر.س" },
                { id: "YER_SANAA", label: "صنعاء" },
                { id: "YER_ADEN", label: "عدن" },
                { id: "USD", label: "$" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCurrency(c.id as any)}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                    selectedCurrency === c.id
                      ? "bg-white text-[#005696] shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* زر السلة */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl bg-[#005696] text-white hover:bg-[#0F4C81] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-black hidden sm:inline">السلة</span>
              {cartItems.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 🌟 3. قسم بطائق المتاجر الست الرئيسية (Underneath Header) */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 pb-3">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#005696] text-white flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                بوابات المتاجر الست المعتمدة للشراء والشحن
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                اختر متجرك للفلترة السريعة وتطبيق كوبونات الخصم الحصرية
              </p>
            </div>
          </div>

          {selectedStoreFilter !== "all" && (
            <button
              onClick={() => setSelectedStoreFilter("all")}
              className="text-xs font-bold text-[#005696] hover:underline cursor-pointer"
            >
              عرض الكل (إلغاء الفلتر)
            </button>
          )}
        </div>

        {/* شبكة البطاقات الست */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
  {sixPlatforms.map((plat, idx) => {
  const storeSlug = plat.code === "AliExpress" ? "aliexpress" : plat.code.toLowerCase();
  const customerUrl = customerStoreUrls[storeSlug] ?? plat.externalUrl;
  const isSelected = selectedStoreFilter === plat.code;
            return (
              <div
                key={plat.id}
                onClick={() => setSelectedStoreFilter(isSelected ? "all" : plat.code)}
                className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col cursor-pointer active:scale-95 ${
                  isSelected
                    ? "border-[#005696] ring-2 ring-[#005696]/20 bg-sky-50/50 shadow-md"
                    : "border-slate-200 bg-white hover:border-[#005696] hover:shadow-sm"
                }`}
              >
                {/* صورة البطاقة */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                  <img
                    src={plat.image}
                    alt={plat.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* رقم البطاقة */}
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/60 text-white text-[10px] font-mono font-bold flex items-center justify-center border border-white/20">
                    {idx + 1}
                  </span>

                  {/* وسام الخصم */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black">
                    {plat.discountTag}
                  </span>

                  {/* العنوان داخل الصورة */}
                  <span className="absolute bottom-1.5 right-1.5 left-1.5 text-white font-black text-xs leading-tight line-clamp-1 drop-shadow-sm">
                    {plat.name}
                  </span>
                </div>

                {/* كود الخصم وزر الطلب السريع */}
                <div className="p-2 space-y-1 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCoupon(plat.couponCode);
                    }}
                    className="w-full py-1 px-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[10px] font-mono font-bold text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {copiedCoupon === plat.couponCode ? (
                      <span className="text-emerald-600 font-bold">تم النسخ ✓</span>
                    ) : (
                      <>
                        <Tag className="w-2.5 h-2.5 text-amber-500" />
                        <span>{plat.couponCode}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToOrder(plat.code);
                    }}
                    className="w-full py-1 px-1 rounded-lg bg-[#005696] hover:bg-[#084273] text-white text-[10px] font-black transition cursor-pointer"
                  >
                    اطلب الآن
                  </button>
  {customerUrl && (
  <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(customerUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-1 py-1 text-[10px] font-bold text-slate-600 transition hover:border-[#005696] hover:text-[#005696]"
                    >
                      تصفح {plat.code}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 🌟 4. شريط الأقسام السريعة */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">الفئات:</span>
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? "bg-slate-900 text-white shadow-2xs font-black"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat === "all" ? "جميع الأقسام" : cat}
          </button>
        ))}
      </section>

      {/* 🌟 5. شبكة المنتج��ت (Products Grid) */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 space-y-4">
        {catalogError && (
          <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
            {catalogError}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>عرض {filteredProducts.length} منتج متوفر للشحن الفوري</span>
          {selectedStoreFilter !== "all" && (
            <span className="text-[#005696]">مصفى لمتجر: {selectedStoreFilter}</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((prod) => (
            <article
              key={prod.id}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-[#005696] shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              {/* صورة المنتج */}
              <div className="relative aspect-square overflow-hidden bg-slate-50">
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {prod.badge && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-xs">
                    {prod.badge}
                  </span>
                )}

                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[9.5px] font-mono font-bold">
                  {prod.store}
                </span>
              </div>

              {/* تفاصيل المنتج */}
              <div className="p-3.5 space-y-2 text-right flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mb-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{prod.rating}</span>
                    <span className="text-slate-400 font-normal">({prod.reviewsCount})</span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 hover:text-[#005696] transition-colors">
                    {prod.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                        {formatPrice(prod.priceSAR)}
                      </span>
                      {prod.oldPriceSAR && (
                        <span className="text-xs text-slate-400 line-through mr-1.5 font-mono">
                          {formatPrice(prod.oldPriceSAR)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {prod.category}
                    </span>
                  </div>

                  {/* أزرار الإجراءات: شراء سريع + إضافة للسلة */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenOrderModal(prod)}
                      className="py-2 px-2 rounded-xl bg-gradient-to-r from-[#005696] to-[#0F4C81] hover:from-[#084273] hover:to-[#0A2540] text-white text-xs font-black transition cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center gap-1"
                    >
                      <span>حاسبة وشراء</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(prod)}
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>إضافة للسلة</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* 🌟 6. نافذة تفاعلية: حاسبة وتعديل المبلغ المالي وخيارات السداد */}
      {selectedProductForOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-4 p-5 sm:p-6 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#005696] flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    تعديل وحاسبة المبلغ: {selectedProductForOrder.title}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-bold">
                    المتجر: {selectedProductForOrder.store} | عمولة 0%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductForOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* تعديل الكمية وسعر القطعة */}
            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-slate-600">سعر السلعة (ر.س):</label>
                <input
                  type="number"
                  min="1"
                  value={orderAmountSAR}
                  onChange={(e) => setOrderAmountSAR(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-center font-bold text-sm focus:outline-none focus:border-[#005696]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600">الكمية المطلوبة:</label>
                <div className="flex items-center justify-between border border-slate-300 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm">{orderQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setOrderQuantity((q) => q + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* نظام توزيع السداد: عربون 50% أو كامل */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">
                خيارات توزيع المبلغ والسداد:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentSplit("half")}
                  className={`p-3 rounded-2xl border-2 text-right transition cursor-pointer ${
                    paymentSplit === "half"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-black"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-black text-emerald-700">✨ عربون 50% مقدم</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    سدد النصف الآن والباقي عند الاستلام
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentSplit("full")}
                  className={`p-3 rounded-2xl border-2 text-right transition cursor-pointer ${
                    paymentSplit === "full"
                      ? "border-[#005696] bg-sky-50 text-[#005696] font-black"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-black text-[#005696]">💳 سداد كامل (100%)</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    دفع القيمة كاملة لسرعة التجهيز
                  </span>
                </button>
              </div>
            </div>

            {/* تفاصيل المبالغ المحسوبة */}
            <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>إجمالي الطلب ({orderQuantity} قطع):</span>
                <span className="font-mono font-bold text-white">
                  {orderAmountSAR * orderQuantity} ر.س (
                  {formatPrice(orderAmountSAR * orderQuantity)})
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-400 font-black text-sm pt-1 border-t border-slate-800">
                <span>المبلغ المطلوب سداده الآن:</span>
                <span className="font-mono text-base">
                  {paymentSplit === "half"
                    ? Math.ceil(orderAmountSAR * orderQuantity * 0.5)
                    : orderAmountSAR * orderQuantity}{" "}
                  ر.س
                </span>
              </div>
              {paymentSplit === "half" && (
                <div className="flex items-center justify-between text-amber-300 text-xs">
                  <span>المتبقي عند المعاينة والاستلام:</span>
                  <span className="font-mono font-bold">
                    {Math.floor(orderAmountSAR * orderQuantity * 0.5)} ر.س
                  </span>
                </div>
              )}
            </div>

            {/* طريقة الدفع المعتمدة */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">طريقة الدفع والحساب:</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                {["كريمي", "ون كاش", "النجم", "جيب", "استلام", "USDT"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 px-2 rounded-xl border text-center transition cursor-pointer ${
                      paymentMethod === m
                        ? "bg-slate-900 text-white border-slate-900 font-black"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {m === "كريمي"
                      ? "🏦 الكريمي"
                      : m === "ون كاش"
                        ? "📱 ون كاش"
                        : m === "النجم"
                          ? "💸 النجم"
                          : m === "جيب"
                            ? "🪙 جيب"
                            : m === "استلام"
                              ? "🤝 عند الاستلام"
                              : "⚡ USDT"}
                  </button>
                ))}
              </div>

              {/* بطاقة الحساب المعتمد */}
              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold">
                    رقم الحساب المعتمد:
                  </span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {paymentMethod === "كريمي"
                      ? "3007123456"
                      : paymentMethod === "ون كاش"
                        ? "777000111"
                        : "الشامل للتسوق"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyAccountNumber(paymentMethod === "كريمي" ? "3007123456" : "777000111")
                  }
                  className="px-2.5 py-1 rounded-xl bg-white text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1 shadow-2xs"
                >
                  {copiedAccount ? "تم النسخ ✓" : "نسخ"}
                </button>
              </div>
            </div>

            {/* أزرار الإجراء عبر واتساب */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendWhatsAppOrder}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال تفاصيل السداد والطلب عبر واتساب 📲</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const product = selectedProductForOrder;
                  setSelectedProductForOrder(null);
                  if (product) goToOrder(product.store, product.title);
                }}
                className="py-3 px-3.5 rounded-xl bg-[#005696] hover:bg-[#084273] text-white font-black text-xs transition cursor-pointer"
              >
                صف��ة الطلب ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 7. سلة المشتريات الجانبية */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-start"
          dir="rtl"
        >
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-4 sm:p-5 text-right animate-slideIn">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#005696]" />
                  <h3 className="font-black text-base text-slate-900">سلة المشتريات</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="py-16 text-center space-y-2 text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto stroke-1" />
                  <p className="text-sm font-bold">سلتك فارغة حالياً</p>
                </div>
              ) : (
                <div className="py-3 space-y-3 max-h-[60vh] overflow-y-auto">
                  {cartItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-2xl border border-slate-200"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-14 h-14 object-cover rounded-xl"
                      />
                      <div className="flex-1 text-right">
                        <h4 className="text-xs font-black text-slate-900 line-clamp-1">
                          {item.product.title}
                        </h4>
                        <span className="text-xs font-mono font-black text-emerald-700">
                          {formatPrice(item.product.priceSAR * item.quantity)}
                        </span>
                        <div className="text-[10px] text-slate-500 font-bold">
                          الكمية: {item.quantity}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setCartItems((prev) =>
                            prev.filter((i) => i.product.id !== item.product.id),
                          )
                        }
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>إجمالي السلة:</span>
                  <span className="text-emerald-700 font-mono">{formatPrice(cartTotalSAR)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (cartItems.length !== 1) {
                      window.alert(
                        "نموذج الطلب الحالي يستقبل منتجًا واحدًا. أرسل كل منتج كطلب مستقل حتى لا تُحذف عناصر من السلة.",
                      );
                      return;
                    }
                    const item = cartItems[0];
                    if (!item) return;
                    setIsCartOpen(false);
                    goToOrder(item.product.store, item.product.title);
                  }}
                  className="w-full py-3 rounded-xl bg-[#005696] hover:bg-[#084273] text-white font-black text-xs transition cursor-pointer"
                >
                  إتمام الشراء الآن ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * شاشة بديلة قديمة محفوظة للتوافق؛ صفحة العملاء تعرض الآن الكتالوج الكامل وبطاقات المتاجر.
 */
const CustomerProductsHiddenPage: React.FC = () => (
  <main dir="rtl" lang="ar" className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900">
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <div
        aria-hidden="true"
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl"
      >
        🛍️
      </div>
      <h1 className="text-2xl font-black text-slate-900">الشامل للتسوق</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
        لا توجد منتجات أو عروض معروضة حاليًا.
      </p>
    </section>
  </main>
);

/**
 * يعرض الكتالوج للعملاء على /products، ويُبقي صفحات الإدارة الفرعية
 * مثل /products/manage داخل Outlet.
 */
const ProductsRouteEntry: React.FC = () => {
  const pathname = useLocation({ select: (location) => location.pathname });

  if (pathname === "/products/manage") {
    return <Outlet />;
  }

  return <ProductsPage />;
};

export const Route = createFileRoute("/products")({
  component: ProductsRouteEntry,
});

export default ProductsPage;
