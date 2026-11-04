<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Fund balances and admin revenue figures are derived from `finance_vouchers` rows (receipts minus payments, per fund and currency) via `src/lib/finance-vouchers.ts`; never hardcode balances, so accounting stays traceable to saved vouchers.
- The Chrome extension source lives in `extension/` and is shipped as `public/alshamel-extension.zip`; re-zip after every edit so the `/extension` download stays in sync.
- The extension cart is browser-local (`src/lib/extension-cart.ts`, `/cart`), and items reach it only via `/cart?add=1&...` from the extension; store domains are allow-listed there so lookalike hosts are rejected.
