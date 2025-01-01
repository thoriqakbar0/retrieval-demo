'use client';

import { Chat } from "@/components/chat";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

type Chunk = {
  text: string;
  embedding: number[];
  order: number;
};

type Status = {
  status: "pending" | "processing" | "completed" | "failed";
  chunks: Chunk[] | null;
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">Status: {status?.status}</p>
          {status?.chunks_processed ? (
            <p className="text-sm text-muted-foreground">
              Chunks processed: {status.chunks_processed}
            </p>
          ) : null}
        </div>
        <Button variant="outline" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            View Document
          </a>
        </Button>
      </div>

      <Tabs defaultValue="chat" className="flex-1">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="chunks">Chunks</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat Methods</CardTitle>
              <CardDescription>Select a retrieval method to use</CardDescription>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant={selectedMethod === "embedding" ? "default" : "outline"}
                  onClick={() => setSelectedMethod("embedding")}
                >
                  Embedding
                </Button>
                <Button 
                  variant={selectedMethod === "rerank" ? "default" : "outline"}
                  onClick={() => setSelectedMethod("rerank")}
                >
                  Rerank
                </Button>
                <Button 
                  variant={selectedMethod === "colpali" ? "default" : "outline"}
                  onClick={() => setSelectedMethod("colpali")}
                >
                  Colpali
                </Button>
                <Button 
                  variant={selectedMethod === "colbert" ? "default" : "outline"}
                  onClick={() => setSelectedMethod("colbert")}
                >
                  ColBERT
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Chat documentId={id} method={selectedMethod} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="chunks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Chunks</CardTitle>
              <CardDescription>
                View the processed chunks of the document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {status?.chunks?.map((chunk, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="font-medium mb-2">Chunk {i + 1}</div>
                      <div className="text-sm">{chunk.text}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 