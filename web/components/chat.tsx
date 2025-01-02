"use client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type Message = {
  id: string
  text: string
  role: "user" | "assistant"
  timestamp: Date
  chunks?: {
    text: string
    score: number
    chunk: string
  }[]
}

interface ChatProps {
  documentId: string;
  method: "embedding" | "rerank" | "colpali" | "colbert";
}

export function Chat({ documentId, method }: ChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openChunks, setOpenChunks] = useState<string[]>([])

  useEffect(() => {
    setMessages([])
    setError(null)
    setOpenChunks([])
  }, [method])

  const toggleChunks = (messageId: string) => {
    setOpenChunks(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    )
  }

  const handleSend = async () => {
    if (!documentId) {
      return
    }

    if (input.trim()) {
      setError(null)
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

        if (!response.ok) {
          if (response.status === 404) {
            router.push('/')
            return
          }
          throw new Error(data.error || 'Failed to get response')
        }

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
        setError(error instanceof Error ? error.message : 'Something went wrong')
        setMessages(prev => prev.slice(0, -1))
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Card className="w-[400px] mx-auto h-[500px] flex flex-col shadow-lg">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">
          {documentId ? `Chat (${method})` : 'Upload a document to start chatting'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3">
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={`flex ${message.role === "user" ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg p-2 ${
                    message.role === "user"
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-xs">{message.text}</p>
                    <p className="text-[10px] mt-1 opacity-80">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {message.chunks && message.chunks.length > 0 && (
                  <Collapsible
                    open={openChunks.includes(message.id)}
                    onOpenChange={() => toggleChunks(message.id)}
                  >
                    <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mx-2">
                      {openChunks.includes(message.id) ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {message.chunks.length} relevant chunks
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {message.chunks.map((chunk, idx) => (
                        <div 
                          key={chunk.chunk} 
                          className="mx-2 p-2 rounded bg-muted/50 border border-border/50"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] font-medium">Chunk {idx + 1}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Score: {chunk.score}
                            </div>
                          </div>
                          <p className="text-[10px]">{chunk.text}</p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-2 bg-muted">
                  <p className="text-xs">Thinking...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="max-w-[90%] rounded-lg p-2 bg-destructive/10 text-destructive text-xs">
                  {error}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            className="text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={documentId ? "Type your message..." : "Upload a document first"}
            disabled={isLoading || !documentId}
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !documentId}
            size="sm"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
