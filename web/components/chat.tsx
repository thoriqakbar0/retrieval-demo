"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"

type Message = {
  id: string
  text: string
  role: "user" | "assistant"
  timestamp: Date
  chunks?: {
    text: string
    score: number
  }[]
}

type CardProps = React.ComponentProps<typeof Card>

interface ChatProps {
  documentId?: string;
  method?: "embedding" | "rerank" | "colpali" | "colbert";
  className?: string;
}

export function Chat({ documentId, method = "embedding", className, ...props }: ChatProps & CardProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [openChunks, setOpenChunks] = useState<string[]>([])

  const toggleChunks = (messageId: string) => {
    setOpenChunks(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    )
  }

  const handleSend = async () => {
    if (!documentId) {
      return // Don't allow chat without a document
    }

    if (input.trim()) {
      const userMessage: Message = {
        id: Math.random().toString(36).substring(7),
        text: input,
        role: "user",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      setInput('')
      setIsLoading(true)

      try {
        const response = await fetch(`/api/chat/${method}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            documentId,
          }),
        })

        const data = await response.json()
        const assistantMessage: Message = {
          id: Math.random().toString(36).substring(7),
          text: data.response,
          role: "assistant",
          timestamp: new Date(),
          chunks: data.chunks
        }
        setMessages(prev => [...prev, assistantMessage])
      } catch (error) {
        console.error('Chat error:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Card className={cn("w-full h-[600px] flex flex-col", className)} {...props}>
      <CardHeader>
        <CardTitle>
          {documentId ? `Chat (${method})` : 'Upload a document to start chatting'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={`flex ${message.role === "user" ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] rounded-lg p-3 ${
                    message.role === "user"
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs mt-1 opacity-80">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {message.chunks && message.chunks.length > 0 && (
                  <Collapsible
                    open={openChunks.includes(message.id)}
                    onOpenChange={() => toggleChunks(message.id)}
                    className="mt-2"
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {openChunks.includes(message.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {message.chunks.length} relevant chunks
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {message.chunks.map((chunk, idx) => (
                        <div 
                          key={idx} 
                          className="bg-muted/50 rounded-lg p-3 text-xs border border-border/50"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-medium">Chunk {idx + 1}</div>
                            <div className="text-muted-foreground">
                              Score: {chunk.score.toFixed(4)}
                            </div>
                          </div>
                          <div className="text-sm">{chunk.text}</div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-lg p-3 bg-muted">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={documentId ? "Type your message..." : "Upload a document first"}
            disabled={isLoading || !documentId}
          />
          <Button onClick={handleSend} disabled={isLoading || !documentId}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
