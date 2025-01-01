'use client';

import { Chat } from "@/components/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import Link from "next/link";

type Status = {
  status: "pending" | "processing" | "completed" | "failed";
  chunks_processed: number;
};

interface DocumentClientProps {
  id: string;
  url: string;
  title: string;
}

type Method = "embedding" | "rerank" | "colpali" | "colbert";

export function DocumentClient({ id, url, title }: DocumentClientProps) {
  const [status, setStatus] = useState<Status>();
  const [selectedMethod, setSelectedMethod] = useState<Method>("embedding");

  useEffect(() => {
    const checkStatus = async () => {
      const res = await fetch(`/api/status/${id}`);
      const data = await res.json();
      setStatus(data);

      if (data.status === "processing" || data.status === "pending") {
        setTimeout(checkStatus, 1000);
      }
    };

    checkStatus();
  }, [id]);

  if (status?.status === "failed") {
    return (
      <div className="container max-w-4xl mx-auto flex flex-col gap-4 items-center justify-center min-h-[400px]">
        <h1 className="text-xl font-bold text-destructive">Processing Failed</h1>
        <p className="text-muted-foreground">The document could not be processed.</p>
        <Button variant="outline" asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  if (status?.status === "processing" || status?.status === "pending") {
    return (
      <div className="container max-w-4xl mx-auto flex flex-col gap-4 items-center justify-center min-h-[400px]">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          Processing document... ({status.chunks_processed} chunks processed)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              View Document
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Ready to chat</p>
          </div>
          <Button variant="outline" className="ml-4" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              View Document
            </a>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="mb-4">Select Chat Method</CardTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button 
              variant={selectedMethod === "embedding" ? "default" : "outline"}
              onClick={() => setSelectedMethod("embedding")}
              className="w-full"
            >
              Embedding
            </Button>
            <Button 
              variant={selectedMethod === "rerank" ? "default" : "outline"}
              onClick={() => setSelectedMethod("rerank")}
              className="w-full"
            >
              Rerank
            </Button>
            <Button 
              variant={selectedMethod === "colpali" ? "default" : "outline"}
              onClick={() => setSelectedMethod("colpali")}
              className="w-full"
            >
              Colpali
            </Button>
            <Button 
              variant={selectedMethod === "colbert" ? "default" : "outline"}
              onClick={() => setSelectedMethod("colbert")}
              className="w-full"
            >
              ColBERT
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Chat documentId={id} method={selectedMethod} />
        </CardContent>
      </Card>
    </div>
  );
} 