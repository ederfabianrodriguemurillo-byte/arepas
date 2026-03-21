import { UsersClient } from "@/components/admin-clients";
import { Banner } from "@/components/ui";
import { requirePrincipal } from "@/lib/auth";
import { getAdminUsersData } from "@/lib/data";

export default async function UsersPage() {
  const currentUser = await requirePrincipal();
  const data = await getAdminUsersData();
  return (
    <div className="space-y-4">
      {data.dbError ? <Banner tone="error">{data.dbError}</Banner> : null}
      <UsersClient users={data.users as never} currentUserRole={currentUser.rol} />
    </div>
  );
}
