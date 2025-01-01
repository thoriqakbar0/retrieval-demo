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
import { useState, useEffect } from "react"
import { getApiUrl } from "@/lib/utils"

type Message = {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

type CardProps = React.ComponentProps<typeof Card>

export function Chat({ className, ...props }: CardProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      text: input,
      isUser: true,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Create a new assistant message with empty text
      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        text: '',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Create SSE connection
      const eventSource = new EventSource(`${getApiUrl()}/chat?message=${encodeURIComponent(input)}`)

      eventSource.onmessage = (event) => {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && !lastMessage.isUser) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                text: lastMessage.text + event.data
              }
            ]
          }
          return prev
        })
      }

      eventSource.onerror = () => {
        eventSource.close()
        setIsLoading(false)
        setError('Connection to the chatbot failed')
      }

      eventSource.addEventListener('done', () => {
        eventSource.close()
        setIsLoading(false)
      })
    } catch (err) {
      setIsLoading(false)
      setError('Failed to send message')
      console.error(err)
    }
  }

  return (
    <Card className={cn("w-[480px] h-[600px] flex flex-col", className)} {...props}>
      <CardHeader>
        <CardTitle>Chatbot</CardTitle>
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-lg p-3 ${
                  message.isUser 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-80">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
          />
          <Button onClick={handleSend} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
