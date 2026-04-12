import { PageHeader } from "@/components/ui/page-header";

export default function DashboardPage() {
  return (
    <div className="space-y-2">
      <PageHeader
        title="Dashboard"
        description="Signed-in area. Later phases will add schedule summaries, alerts, and quick actions here."
      />
    </div>
  );
}
