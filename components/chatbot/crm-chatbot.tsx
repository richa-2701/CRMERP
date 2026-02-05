// frontend/components/chatbot/crm-chatbot.tsx
"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { X, Send, Bot, User, Loader2, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { chatApi, ApiUser } from "@/lib/api"

interface Message {
  id: string
  type: "user" | "bot"
  content: string
  timestamp: Date
  action?: {
    type: "create_lead" | "schedule_meeting" | "schedule_demo"
    data?: any
  }
}

interface CRMChatbotProps {
  currentUser: ApiUser
  isOpen: boolean
  onClose: () => void
}

export function CRMChatbot({ currentUser, isOpen, onClose }: CRMChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Hi! I'm your CRM assistant. I can help you create leads, schedule meetings, schedule demos and more. What would you like to do?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen, isMobile])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const processUserMessage = async (message: string) => {
    setIsLoading(true)

    try {
      const response = await chatApi.sendMessage(message, currentUser.usernumber)

      const botMessage: Message = {
        id: Date.now().toString(),
        type: "bot",
        content: response.reply || "I'm here to help with your CRM tasks. What would you like to do?",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error("Failed to process message:", error)

      // Fallback to local processing if backend fails
      const botMessage: Message = {
        id: Date.now().toString(),
        type: "bot",
        content:
          "I'm having trouble connecting to the server right now. Please try again later, or contact support if the issue persists.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const extractLeadData = (message: string) => {
    const data: any = {}

    const patterns = {
      company_name: /company:\s*([^\n,]+)/i,
      contact_name: /contact:\s*([^\n,]+)/i,
      phone: /phone:\s*([^\n,]+)/i,
      email: /email:\s*([^\n,]+)/i,
      address: /address:\s*([^\n,]+)/i,
    }

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = message.match(pattern)
      if (match) {
        data[key] = match[1].trim()
      }
    })

    return data
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const messageText = input.trim()

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("") // Clear input immediately after storing the value

    await processUserMessage(messageText)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading) {
        handleSendMessage()
      }
    }
  }

  if (!isOpen) return null

  return (
    <Card
      className={cn(
        "fixed shadow-xl z-50 flex flex-col animate-in slide-in-from-bottom-2 duration-300",
        isMobile ? "inset-0 w-full h-full rounded-none border-0" : "bottom-6 right-6 w-96 h-[600px] rounded-lg border",
      )}
    >
      {/* Header - Fixed at top */}
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0 bg-background/95 backdrop-blur",
          isMobile ? "px-4 py-4" : "px-4 py-3 pb-3",
        )}
      >
        <CardTitle className={cn("flex items-center gap-2", isMobile ? "text-lg" : "text-base")}>
          <Bot className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} />
          CRM Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className={cn(isMobile ? "h-8 w-8" : "h-6 w-6")}>
          <X className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
        </Button>
      </CardHeader>

      {/* Messages Area - Scrollable middle section */}
      <div className="flex-1 overflow-hidden bg-background">
        <ScrollArea className="h-full">
          <div className={cn("space-y-4", isMobile ? "p-4 pb-2" : "p-4 pb-2")}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex items-start gap-3", message.type === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center flex-shrink-0",
                    isMobile ? "w-8 h-8 mt-1" : "w-7 h-7 mt-0.5",
                    message.type === "bot" ? "bg-primary" : "bg-secondary",
                  )}
                >
                  {message.type === "bot" ? (
                    <Bot className={cn("text-primary-foreground", isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                  ) : (
                    <User className={cn("text-secondary-foreground", isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                  )}
                </div>

                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%] shadow-sm",
                    isMobile ? "text-sm leading-relaxed" : "text-sm leading-relaxed",
                    message.type === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-muted text-muted-foreground rounded-tl-md",
                  )}
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "pre-wrap",
                    hyphens: "auto",
                  }}
                >
                  {message.content}
                  {message.action && (
                    <Badge
                      variant="secondary"
                      className={cn("mt-2 text-xs", message.type === "user" ? "bg-primary-foreground/20" : "")}
                    >
                      {message.action.type.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "rounded-full bg-primary flex items-center justify-center flex-shrink-0",
                    isMobile ? "w-8 h-8 mt-1" : "w-7 h-7 mt-0.5",
                  )}
                >
                  <Bot className={cn("text-primary-foreground", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                </div>
                <div
                  className={cn(
                    "bg-muted rounded-2xl rounded-tl-md px-4 py-3 shadow-sm",
                    isMobile ? "text-sm" : "text-sm",
                  )}
                >
                  <Loader2 className={cn("animate-spin", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      <div className={cn("border-t bg-background/95 backdrop-blur shrink-0", isMobile ? "p-4" : "p-4")}>
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to create leads, schedule meetings..."
              className={cn(
                "resize-none min-h-[44px] max-h-[120px] transition-all duration-200 border-2 focus:border-primary/50 rounded-xl",
                isMobile ? "text-base py-3 px-4" : "text-sm py-3 px-4",
              )}
              disabled={isLoading}
              rows={1}
              style={{
                wordBreak: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
              }}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            size={isMobile ? "default" : "default"}
            disabled={isLoading || !input.trim()}
            className={cn(
              "shrink-0 transition-all duration-200 hover:scale-105 rounded-xl",
              isMobile ? "h-[44px] px-4" : "h-[44px] px-4",
            )}
          >
            {isLoading ? (
              <Loader2 className={cn("animate-spin", isMobile ? "h-4 w-4" : "h-4 w-4")} />
            ) : (
              <Send className={cn(isMobile ? "h-4 w-4" : "h-4 w-4")} />
            )}
            {isMobile && <span className="ml-2">Send</span>}
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function FloatingChatbotButton({ onClick }: { onClick: () => void }) {
  const isMobile = useIsMobile()

  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        "fixed shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none hover:scale-110 z-40 rounded-full",
        isMobile ? "bottom-20 right-4 h-12 w-12" : "bottom-6 right-6 h-14 w-14",
      )}
    >
      <MessageCircle className={cn("animate-bounce", isMobile ? "h-5 w-5" : "h-6 w-6")} />
      <span className="sr-only">Open AI Assistant</span>
    </Button>
  )
}
