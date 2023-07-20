import type { V2_MetaFunction } from "@remix-run/node";
import { useCurrentUser } from "~/root";

export const meta: V2_MetaFunction = () => {
  return [
    { title: "Democratic Fine-tuning" },
    { name: "description", content: "Welcome to DFT!" },
  ];
};

export default function Index() {
  const user = useCurrentUser();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix Cowpunk</h1>
      {
        user ? (
          <p>
            You're signed in as <strong>{user.email}</strong>
            {/* logout button */}
            <form action="/auth/logout" method="post">
              <button type="submit">Sign out</button>
            </form>
          </p>
        ) : (
          <p>
            You're not signed in.{" "}
            <a href="/auth/login">Sign in</a>.
          </p>
        )
      }
    </div>
  );
}
