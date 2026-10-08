import React, { useState } from 'react';
import { 
  Menu, Bell, RefreshCw, Search, Home, LayoutGrid, ShoppingCart, 
  Heart, UserRound, Star, ArrowLeft, X, Bot, MessageCircle, 
  Plus, Minus, Trash2, Check, ChevronLeft, Phone, Lock, Eye, 
  EyeOff, LogIn, ShieldCheck, Info, RotateCcw, ShoppingBag, 
  FileText, MapPin, Headphones, Grid2x2 
} from 'lucide-react';

// قائمة الأقسام
const categories = [
  { id: 'shemagh', name: 'الغتر والأشمغة' },
  { id: 'gifts', name: 'تحف وهدايا' },
  { id: 'watches', name: 'ساعات وخواتم', sub: 'رجالي ونسائي' },
  { id: 'perfume', name: 'عطور', sub: 'رجالي ونسائي' },
  { id: 'sunglasses', name: 'نظارات', sub: 'رجالي ونسائي' },
  { id: 'toys', name: 'ألعاب أطفال' },
  { id: 'clothing', name: 'ملابس داخلية' },
  { id: 'electronics', name: 'إلكترونيات عامة' },
  { id: 'gold', name: 'ذهب ومجوهرات' },
  { id: 'shein', name: 'شي إن', brand: 'SHEIN' },
  { id: 'amazon', name: 'أمازون', brand: 'amazon' },
  { id: 'aliexpress', name: 'علي إكسبرس', brand: 'AliExpress' },
];

// بيانات المنتجات
const initialProducts = [
  { id: 1, name: 'سلسال ذهب بتصميم الشمس', category: 'gold', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500', price: 1580, oldPrice: 1750, weight: '2.23', badge: 'الأكثر طلبًا' },
  { id: 2, name: 'خاتم ذهب عيار 21', category: 'gold', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500', price: 1630, weight: '2.18', badge: 'وصل حديثًا' },
  { id: 3, name: 'أساور ذهب بتصميم ناعم', category: 'gold', image: 'https://images.unsplash.com/photo-1611591475152-4d01a14e0038?w=500', price: 2450, weight: '3.60' },
  { id: 4, name: 'شماغ أحمر فاخر', category: 'shemagh', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500', price: 129 },
  { id: 5, name: 'باقة ورد وصندوق هدايا', category: 'gifts', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500', price: 249 },
  { id: 6, name: 'ساعة كلاسيكية أنيقة', category: 'watches', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500', price: 299 },
  { id: 7, name: 'عطر فاخر أصلي', category: 'perfume', image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=500', price: 189 },
  { id: 8, name: 'سماعات لاسلكية حديثة', category: 'electronics', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500', price: 199 },
];

const money = (val) => val.toLocaleString('en-US');

export default function App() {
  const [view, setView] = useState('home'); // home, products, cart, favorites, account
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = (next) => { 
    setView(next); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const toggleFavorite = (id) => {
    setFavorites(curr => curr.includes(id) ? curr.filter(i => i !== id) : [...curr, id]);
  };

  const addToCart = (id) => {
    setCart(curr => ({ ...curr, [id]: (curr[id] || 0) + 1 }));
  };

  const updateQty = (id, delta) => {
    setCart(curr => {
      const next = { ...curr };
      const q = (next[id] || 0) + delta;
      if (q <= 0) delete next[id]; 
      else next[id] = q;
      return next;
    });
  };

  const cartCount = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const cartTotal = initialProducts.reduce((sum, item) => sum + item.price * (cart[item.id] || 0), 0);

  const filtered = initialProducts.filter(p => 
    (category === 'all' || p.category === category) && 
    p.name.includes(search.trim())
  );

  const displayed = view === 'favorites' 
    ? initialProducts.filter(p => favorites.includes(p.id)) 
    : view === 'home' 
      ? initialProducts.slice(0, 4) 
      : filtered;

  return (
    <div className="store-app" dir="rtl">
      {/* الترويسة العلوية */}
      <header className="store-header">
        <div className="header-top">
          <div className="brand">
            <div className="w-10 h-10 rounded-full bg-[#F07832] flex items-center justify-center font-bold text-white text-lg">
              ش
            </div>
            <div>
              <h1>السوق الشامل</h1>
              <small>كل ما تحب… في مكان واحد</small>
            </div>
          </div>
          <div className="header-actions">
            <button className="store-icon-button" onClick={() => setMenuOpen(!menuOpen)} title="القائمة">
              <Menu size={18} />
            </button>
            <button className="store-icon-button" onClick={() => alert('لا توجد إشعارات جديدة')} title="التنبيهات">
              <Bell size={18} />
            </button>
            <button className="store-icon-button" onClick={() => { setCategory('all'); setSearch(''); }} title="تحديث">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* حقل البحث */}
        <div className="search-row">
          <div className="search-field">
            <Search size={16} />
            <input 
              placeholder="ابحث عن كل ما تحتاجه…" 
              value={search} 
              onChange={e => { setSearch(e.target.value); setView(e.target.value ? 'products' : 'home'); }} 
            />
            {search && <button onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
          <select className="currency" defaultValue="SAR"><option value="SAR">ر.س</option></select>
        </div>

        {/* التبويبات السريعة */}
        <nav className="top-tabs">
          <button className={`store-nav-button ${view === 'home' ? 'active' : ''}`} onClick={() => navigate('home')}>
            الرئيسية
          </button>
          {categories.slice(0, 4).map(cat => (
            <button 
              key={cat.id} 
              className={`store-nav-button ${category === cat.id && view === 'products' ? 'active' : ''}`} 
              onClick={() => { setCategory(cat.id); navigate('products'); }}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </header>

      {/* الصفحة الرئيسية */}
      {view === 'home' && (
        <>
          <section className="gift-banner">
            <div className="gift-copy">
              <span className="gift-label">متجر السوق الشامل</span>
              <h2>هدايا فاخرة</h2>
              <p>تختصر مشاعرك بأناقة</p>
              <button className="gift-link" onClick={() => { setCategory('gifts'); navigate('products'); }}>
                اكتشف الهدايا ←
              </button>
            </div>
          </section>

          {/* شبكة الأقسام */}
          <section className="category-section">
            <div className="section-topline">
              <h2>تسوّق حسب القسم</h2>
              <span>كل ما تبحث عنه</span>
            </div>
            <div className="category-grid">
              {categories.map(cat => (
                <button key={cat.id} className="category-button" onClick={() => { setCategory(cat.id); navigate('products'); }}>
                  <span className="category-circle font-bold text-xs">{cat.brand || cat.name.slice(0, 2)}</span>
                  <span className="category-label">{cat.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* منتجات مقترحة */}
          <section className="product-section">
            <div className="recommended-heading">
              <h2><Star size={16} fill="currentColor" /> منتجات موصى بها</h2>
              <button className="view-all" onClick={() => { setCategory('all'); navigate('products'); }}>عرض الكل ←</button>
            </div>
            <div className="product-grid">
              {displayed.map(p => (
                <article key={p.id} className="product-card">
                  <div className="product-photo">
                    <img src={p.image} alt={p.name} className="w-full h-40 object-cover" />
                    <button className={`favorite-button ${favorites.includes(p.id) ? 'selected' : ''}`} onClick={() => toggleFavorite(p.id)}>
                      <Heart size={16} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} />
                    </button>
                    {p.badge && <span className="product-badge">{p.badge}</span>}
                  </div>
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <div className="product-price"><strong>{money(p.price)} <span>ر.س</span></strong></div>
                    <button className="add-to-cart" onClick={() => addToCart(p.id)}>
                      {cart[p.id] ? <Check size={14} /> : <ShoppingCart size={14} />} أضف للسلة
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {/* صفحة المنتجات والمفضلة */}
      {(view === 'products' || view === 'favorites') && (
        <section className="p-3">
          <h2 className="font-bold text-base mb-3">
            {view === 'favorites' ? 'المنتجات المفضلة' : 'تصفح المنتجات'}
          </h2>
          <div className="product-grid">
            {displayed.length === 0 ? (
              <p className="text-gray-400 text-sm col-span-2 text-center py-8">لا توجد منتجات لعرضها</p>
            ) : (
              displayed.map(p => (
                <article key={p.id} className="product-card">
                  <div className="product-photo">
                    <img src={p.image} alt={p.name} className="w-full h-40 object-cover" />
                    <button className={`favorite-button ${favorites.includes(p.id) ? 'selected' : ''}`} onClick={() => toggleFavorite(p.id)}>
                      <Heart size={16} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <div className="product-price"><strong>{money(p.price)} <span>ر.س</span></strong></div>
                    <button className="add-to-cart" onClick={() => addToCart(p.id)}>
                      {cart[p.id] ? <Check size={14} /> : <ShoppingCart size={14} />} أضف للسلة
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {/* صفحة السلة */}
      {view === 'cart' && (
        <section className="p-4">
          <h2 className="text-lg font-bold mb-4">سلة المشتريات ({cartCount})</h2>
          {cartCount === 0 ? (
            <div className="text-center py-10">
              <ShoppingCart size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">سلتك فارغة حالياً</p>
            </div>
          ) : (
            <div>
              {initialProducts.filter(p => cart[p.id]).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b">
                  <img src={p.image} alt={p.name} className="w-14 h-14 rounded object-cover" />
                  <div className="flex-1 px-3">
                    <h4 className="font-bold text-sm">{p.name}</h4>
                    <span className="text-xs text-[#123F53] font-bold">{money(p.price)} ر.س</span>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => updateQty(p.id, 1)} className="border px-2 rounded">+</button>
                      <span>{cart[p.id]}</span>
                      <button onClick={() => updateQty(p.id, -1)} className="border px-2 rounded">-</button>
                    </div>
                  </div>
                  <button onClick={() => updateQty(p.id, -(cart[p.id] || 0))}><Trash2 size={16} className="text-red-500" /></button>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base mt-4 pt-3 border-t">
                <span>الإجمالي:</span>
                <span>{money(cartTotal)} ر.س</span>
              </div>
              <button className="w-full mt-4 bg-[#123F53] text-white py-3 rounded-lg font-bold" onClick={() => alert('طلب تجريبي ناجح!')}>
                متابعة الشراء ←
              </button>
            </div>
          )}
        </section>
      )}

      {/* صفحة حسابي / تسجيل الدخول */}
      {view === 'account' && (
        <section className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#123F53] text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
            ش
          </div>
          <h2 className="font-bold text-lg">السوق الشامل</h2>
          <p className="text-xs text-gray-500 mb-6">سجل دخولك لعرض تفاصيل حسابك وطلباتك</p>
          <form onSubmit={e => { e.preventDefault(); alert('تم تسجيل الدخول بنجاح'); }}>
            <div className="mb-3 text-right">
              <label className="text-xs text-gray-600 block mb-1">رقم الهاتف</label>
              <input type="tel" placeholder="770000000" className="w-full border p-2.5 rounded-lg text-sm outline-none" required />
            </div>
            <div className="mb-4 text-right">
              <label className="text-xs text-gray-600 block mb-1">كلمة المرور</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full border p-2.5 rounded-lg text-sm outline-none" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-2.5 top-2.5 text-gray-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#123F53] text-white py-2.5 rounded-lg font-bold text-sm">
              دخول
            </button>
          </form>
        </section>
      )}

      {/* شريط التنقل السفلي */}
      <nav className="bottom-nav">
        {[
          { id: 'home', name: 'الرئيسية', icon: Home },
          { id: 'products', name: 'المنتجات', icon: LayoutGrid },
          { id: 'cart', name: 'السلة', icon: ShoppingCart },
          { id: 'favorites', name: 'المفضلة', icon: Heart },
          { id: 'account', name: 'حسابي', icon: UserRound }
        ].map(tab => (
          <button key={tab.id} className={`store-nav-button ${view === tab.id ? 'active' : ''}`} onClick={() => navigate(tab.id)}>
            <div className="nav-icon relative">
              <tab.icon size={20} />
              {tab.id === 'cart' && cartCount > 0 && <span className="nav-count">{cartCount}</span>}
            </div>
            <span>{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
