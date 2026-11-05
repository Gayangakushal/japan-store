import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export const Route = createFileRoute("/admin-preview")({
  ssr: false,
  head: () =>
    pageHead(
      "Admin workspace preview",
      "Preview KUMO product management before connecting the database.",
    ),
  component: AdminWorkspace,
});
