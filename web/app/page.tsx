import { Chat } from "@/components/chat";
import { getApiUrl } from "@/lib/utils";

export default async function Home() {
  const hello = await fetch(`${getApiUrl()}/api/hello`)
  const data = await hello.json()
  console.log(data)
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] debug">
      Comparing different retrieval strategies: {data.message}
      <Chat />
    </div>
  );
}
