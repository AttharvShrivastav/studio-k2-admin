import { Brand } from "./Brand";

export function LoadingScreen() {
  return (
    <main className="loading-screen">
      <Brand />
      <span className="loading-line" aria-label="Loading" />
    </main>
  );
}
