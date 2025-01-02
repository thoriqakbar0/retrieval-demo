'use client';

import { Chat } from "@/components/chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

type Method = "embedding" | "rerank" | "colpali" | "colbert";

interface ClientProps {
  document: {
    id: string;
    title: string;
    url: string;
  };
}

export function Client({ document }: ClientProps) {
  const [selectedMethod, setSelectedMethod] = useState<Method>("embedding");

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{document.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Ready to chat</p>
          </div>
          <Button variant="outline" className="ml-4" asChild>
            <a href={document.url} target="_blank" rel="noopener noreferrer">
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
              disabled
            >
              Colpali (coming soon)
            </Button>
            <Button 
              variant={selectedMethod === "colbert" ? "default" : "outline"}
              onClick={() => setSelectedMethod("colbert")}
              className="w-full"
              disabled
            >
              ColBERT (coming soon)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Chat documentId={document.id} method={selectedMethod} />
        </CardContent>
      </Card>
    </div>
  );
} 