import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Forward the file to the backend
    const formDataForBackend = new FormData();
    formDataForBackend.append('file', file);

    const response = await fetch(`${getApiUrl()}/upload`, {
      method: 'POST',
      body: formDataForBackend,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    // Return the backend response directly
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
} 