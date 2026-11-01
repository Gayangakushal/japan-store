import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import { accountQuery, storeQuery } from "@/lib/store";
import { signOut } from "@/lib/sign-out";
import { pageHead } from "@/lib/page-head";
import ProductImage from "@/kumo/ProductImage.jsx";
export const Route = createFileRoute("/_authenticated/admin")({
  head: () =>
    pageHead("Store administration", "Manage the KUMO catalogue and WhatsApp ordering settings."),
  loader: async ({ context }) => {
    const account = await context.queryClient.fetchQuery(accountQuery);
    if (!account?.isAdmin) throw redirect({ to: "/auth" });
    await context.queryClient.ensureQueryData(storeQuery);
  },
  component: Admin,
});
function Admin() {
  const { data } = useSuspenseQuery(storeQuery),
    queryClient = useQueryClient(),
    navigate = useNavigate();
  const [tab, setTab] = useState("Products"),
    [edit, setEdit] = useState<TablesInsert<"products"> | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const ramen = edit?.ramen as { [key: string]: Json | undefined } | null | undefined;
  async function mutate(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      if (result.error) throw new Error(result.error.message);
      await queryClient.invalidateQueries({ queryKey: ["store"] });
      setEdit(null);
      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="kumo-console min-h-screen bg-background text-foreground px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <Link to="/" className="text-primary text-2xl font-bold">
              雲 kumo
            </Link>
            <h1>Store administration</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/">View shop</Link>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut(queryClient);
                await navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
        <div className="flex gap-2 border-b border-border pb-3">
          {["Products", "Settings"].map((t) => (
            <Button key={t} variant={tab === t ? "default" : "ghost"} onClick={() => setTab(t)}>
              {t}
            </Button>
          ))}
        </div>
        {message && <p role="status">{message}</p>}
        {tab === "Products" ? (
          <>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <h2 className="text-xl">Product collection ({data.products.length})</h2>
              <Button
                onClick={() =>
                  setEdit({
                    name: "",
                    subtitle: "",
                    category: "Ramen",
                    price: 0,
                    image: "",
                    tag: "NEW",
                    size: "",
                  })
                }
              >
                <Plus /> Add product
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4">Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p: Tables<"products">) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="py-4">
                        <div className="flex gap-4 items-center min-w-48">
                          <ProductImage product={p} className="h-14 w-14 object-contain" />
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      <td className="pr-4">{p.category}</td>
                      <td className="whitespace-nowrap pr-4">
                        Rs. {p.price.toLocaleString("en-LK")}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${p.name}`}
                            title={`Edit ${p.name}`}
                            onClick={() => setEdit({ ...p })}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            disabled={busy}
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${p.name}`}
                            title={`Delete ${p.name}`}
                            onClick={() => {
                              if (window.confirm(`Remove ${p.name}?`))
                                void mutate(() =>
                                  supabase
                                    .from("products")
                                    .delete()
                                    .eq("id", p.id)
                                    .select()
                                    .single(),
                                );
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <form
            className="max-w-lg space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void mutate(() =>
                supabase
                  .from("store_settings")
                  .update({ name: String(form.get("name")), phone: String(form.get("phone")) })
                  .eq("id", true)
                  .select()
                  .single(),
              );
            }}
          >
            <h2 className="text-xl">Store settings</h2>
            <label className="block">
              Store name
              <input
                className="mt-2 block w-full p-3 border border-input bg-background"
                name="name"
                defaultValue={data.settings.name}
                required
              />
            </label>
            <label className="block">
              WhatsApp number
              <input
                className="mt-2 block w-full p-3 border border-input bg-background"
                name="phone"
                defaultValue={data.settings.phone}
                pattern="\+?[0-9 ]{9,16}"
                placeholder="Country code and number"
              />
            </label>
            <Button disabled={busy}>Save settings</Button>
          </form>
        )}
        {edit && (
          <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4">
            <form
              className="bg-background border border-border rounded-md max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const { id, ...fields } = edit;
                const payload = {
                  name: fields.name,
                  category: fields.category,
                  subtitle: fields.subtitle ?? "",
                  price: Number(fields.price),
                  old: fields.old ? Number(fields.old) : null,
                  image: fields.image,
                  tag: fields.tag ?? "",
                  size: fields.size ?? "",
                  ramen: fields.ramen ?? null,
                };
                void mutate(() =>
                  id
                    ? supabase.from("products").update(payload).eq("id", id).select().single()
                    : supabase.from("products").insert(payload).select().single(),
                );
              }}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl">{edit.id ? "Edit product" : "Add product"}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label="Close editor"
                  onClick={() => setEdit(null)}
                >
                  <X />
                </Button>
              </div>
              {(
                [
                  ["name", "Product name"],
                  ["subtitle", "Short description"],
                  ["price", "Price (LKR)"],
                  ["old", "Previous price"],
                  ["size", "Size / volume"],
                  ["image", "Image URL"],
                  ["tag", "Product label"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  {label}
                  <input
                    className="mt-1 block w-full border border-input bg-background p-2"
                    required={["name", "price", "image"].includes(key)}
                    type={["price", "old"].includes(key) ? "number" : "text"}
                    min="0"
                    step={["price", "old"].includes(key) ? "0.01" : undefined}
                    value={edit[key] ?? ""}
                    onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                  />
                </label>
              ))}
              <label className="block text-sm">
                Category
                <select
                  className="mt-1 block w-full border border-input bg-background p-2"
                  value={edit.category}
                  onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                >
                  {["Ramen", "Chocolate", "Beauty"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {ramen && (
                <fieldset className="space-y-3 border border-border p-3">
                  <legend>Ramen reference catalogue</legend>
                  {[
                    "slug",
                    "brand",
                    "country",
                    "flavor",
                    "price_jpy",
                    "unit",
                    "spicy_level",
                    "image",
                    "image_alt",
                  ].map((key) => (
                    <label key={key} className="block text-sm">
                      {key.replaceAll("_", " ")}
                      <input
                        className="mt-1 block w-full border border-input bg-background p-2"
                        required
                        type={["price_jpy", "spicy_level"].includes(key) ? "number" : "text"}
                        min={key === "price_jpy" ? 1 : 0}
                        max={key === "spicy_level" ? 5 : undefined}
                        step="1"
                        value={String(ramen[key] ?? "")}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            ramen: {
                              ...ramen,
                              [key]: ["price_jpy", "spicy_level"].includes(key)
                                ? Number(e.target.value)
                                : e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                  <label className="block text-sm">
                    Availability
                    <select
                      className="block w-full p-2"
                      value={String(ramen["availability"])}
                      onChange={(e) =>
                        setEdit({ ...edit, ramen: { ...ramen, availability: e.target.value } })
                      }
                    >
                      {["unconfirmed", "in_stock", "out_of_stock"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <p className="text-sm">
                    JPY is an estimated Japan retail reference. Set an LKR selling price above zero
                    to enable ordering. Confirm stock and image permission before sale.
                  </p>
                </fieldset>
              )}
              <Button disabled={busy}>Save product</Button>
              {message && <p role="status">{message}</p>}
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
