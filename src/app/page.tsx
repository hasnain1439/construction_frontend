import { redirect } from "next/navigation";

/** `/` → the company dashboard (the proxy sends signed-out visitors to /login first). */
export default function Home() {
  redirect("/dashboard");
}
