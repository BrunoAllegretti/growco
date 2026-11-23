import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DashboardPreview } from "@/components/DashboardPreview";

/** Local-only visual reference. It has no authentication or data dependency. */
export const Route = createFileRoute("/preview")({
  component: Preview,
});

function Preview() {
  return (
    <AppLayout preview>
      <DashboardPreview />
    </AppLayout>
  );
}
