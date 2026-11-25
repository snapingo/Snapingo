import { requireStaffFeature } from "@/lib/dal";
import CustomPackageFormPage from "@/components/admin/customPackages/CustomPackageFormPage";

export default async function StaffNewCustomPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; tripOf?: string; mode?: string }>;
}) {
  await requireStaffFeature("customPackages");
  const { leadId, tripOf, mode } = await searchParams;
  return <CustomPackageFormPage isNew leadId={leadId} tripOfId={tripOf} tripMode={mode} />;
}
