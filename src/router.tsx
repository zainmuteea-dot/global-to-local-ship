export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { title: "السوق الشامل | تسوّق كل ما تحب" },
      { name: "description", content: "السوق الشامل، وجهتك الأولى للهدايا والأزياء والمجوهرات والإلكترونيات." },
      { property: "og:title", content: "السوق الشامل" },
      { property: "og:description", content: "تسوّق الهدايا والأزياء والمجوهرات في السوق الشامل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // بيانات دعم تطبيق الجوال
      { name: "theme-color", content: "#123F53" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "السوق الشامل" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
