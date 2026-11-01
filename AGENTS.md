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

- The KUMO storefront lives in src/kumo as client-only JSX (it reads localStorage/window at render), mounted from src/routes/index.tsx via ClientOnly + lazy.
- Shared catalogue and store settings use Lovable Cloud with public reads and database-enforced admin writes; only the shopping bag remains browser-local so customer carts stay independent.
- Admin access uses a protected named /admin route and separate user_roles rows; roles are assigned by trusted management, never public signup or browser metadata.
