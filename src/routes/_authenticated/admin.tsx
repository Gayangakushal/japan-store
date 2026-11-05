import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import AdminWorkspace from "@/components/admin/AdminWorkspace";
import { accountQuery, storeQuery } from "@/lib/store";
import * as actions from "@/lib/admin-store";
import { signOut } from "@/lib/sign-out";
import { pageHead } from "@/lib/page-head";
import KumoLoading from "@/components/KumoLoading";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("Store administration", "Manage the KUMO catalogue and store settings."),
  loader: async ({ context }) => {
    const account = await context.queryClient.fetchQuery(accountQuery);
    if (!account?.isAdmin) throw redirect({ to: "/auth" });
    await context.queryClient.ensureQueryData(storeQuery);
  },
  pendingComponent: () => <KumoLoading label="Preparing your workspace..." />,
  errorComponent: ({ reset }) => (
    <main className="p-8">
      <h1>Unable to load the workspace</h1>
      <p>Check your connection and confirm the Supabase setup SQL has been run.</p>
      <button onClick={reset}>Try again</button> <Link to="/auth">Back to sign-in</Link>
    </main>
  ),
  component: Admin,
});
function Admin() {
  const { data } = useSuspenseQuery(storeQuery);
  const client = useQueryClient(),
    navigate = useNavigate();
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["store"] });
  };
  return (
    <AdminWorkspace
      live={{
        data,
        saveProduct: async (product) => {
          await actions.saveProduct(product);
          await refresh();
        },
        deleteProduct: async (product) => {
          await actions.deleteProduct(product);
          await refresh();
        },
        saveCategories: async (categories) => {
          await actions.saveCategories(categories);
          await refresh();
        },
        saveSettings: async (settings) => {
          await actions.saveSettings(settings);
          await refresh();
        },
        uploadImage: actions.uploadProductImage,
        signOut: async () => {
          await signOut(client);
          await navigate({ to: "/auth", replace: true });
        },
      }}
    />
  );
}
