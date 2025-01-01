import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/utils";

interface Props {
  params: {
    documentId: string;
  };
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { documentId } = params;
    
    // Fetch status from backend
    const response = await fetch(`${getApiUrl()}/status/${documentId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to check status');
    }

    // Return the backend response directly
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
} 