import { redirect } from "next/navigation";

// The dashboard is the home surface; middleware bounces unauthenticated
// visitors to /login.
export default function RootPage() {
  redirect("/dashboard");
}
