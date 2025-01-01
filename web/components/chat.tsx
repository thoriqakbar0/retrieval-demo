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
  method?: "cosine" | "euclidean" | "manhattan" | "dot_product";
  className?: string;
}

export function Chat({ documentId, method = "cosine", className, ...props }: ChatProps & CardProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
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
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            documentId,
            method,
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
        <CardTitle>Chat ({method})</CardTitle>
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
                {message.chunks && (
                  <div className="mt-2 space-y-2">
                    {message.chunks.map((chunk, idx) => (
                      <div key={idx} className="bg-gray-50 rounded p-2 text-xs">
                        <div className="font-medium">Chunk {idx + 1} (Score: {chunk.score.toFixed(4)})</div>
                        <div className="mt-1">{chunk.text}</div>
                      </div>
                    ))}
                  </div>
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
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
