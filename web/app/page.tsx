import { Upload } from "@/components/upload";
import { getTotalDocuments } from "@/lib/schema";

export default async function Home(): Promise<JSX.Element> {
  let totalDocuments = 0;

  try {
    totalDocuments = await getTotalDocuments();
  } catch (error) {
    console.error("Error fetching total documents:", error);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)] debug">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-bold">Total Documents: {totalDocuments}</h1>
      </div>
      <div className="w-full max-w-2xl space-y-8">
        <Upload />
      </div>
    </div>
  );
}
