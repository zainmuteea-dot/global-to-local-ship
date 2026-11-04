const DEFAULT_SITE = "https://alsouq-alshamel-dwuv0hkpo-zain-muteea.vercel.app";
const input = document.getElementById("site");
const msg = document.getElementById("msg");
const openCart = document.getElementById("open-cart");

const setCartLink = (site) => {
  openCart.href = `${site.replace(/\/+$/, "")}/cart`;
};

chrome.storage.sync.get({ siteUrl: DEFAULT_SITE }, (v) => {
  const savedSite = v.siteUrl || DEFAULT_SITE;
  input.value = savedSite.includes("global-to-local-ship.lovable.app") ? DEFAULT_SITE : savedSite;
  if (input.value !== savedSite) chrome.storage.sync.set({ siteUrl: input.value });
  setCartLink(input.value);
});

document.getElementById("save").addEventListener("click", () => {
  const value = input.value.trim().replace(/\/+$/, "");
  if (!/^https:\/\/[^\s/]+/.test(value)) {
    msg.style.color = "#dc2626";
    msg.textContent = "العنوان يجب أن يبدأ بـ https://";
    return;
  }
  chrome.storage.sync.set({ siteUrl: value }, () => {
    msg.style.color = "#0284c7";
    msg.textContent = "تم الحفظ ✓";
    setCartLink(value);
  });
});
