import { create } from 'zustand'

type Message = {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export const useStore = create<{
  messages: Message[];
  addMessage: (message: Message) => void;
}>((set) => ({
  messages: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
}));
