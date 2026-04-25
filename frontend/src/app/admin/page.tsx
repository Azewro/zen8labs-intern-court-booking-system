import { redirect } from "next/navigation";

export default function AdminPage() {
  // Khi user vào /admin, tự động chuyển hướng sang /admin/courts cho tiện
  redirect("/admin/courts");
}
