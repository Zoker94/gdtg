import { create } from 'zustand';

export interface Message {
  id: string;
  transaction_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  status?: 'sending' | 'sent' | 'error';
}

interface ChatState {
  messages: Record<string, Message[]>;
  isConnected: boolean;
  
  // Actions
  setMessages: (transactionId: string, messages: Message[]) => void;
  addMessage: (transactionId: string, message: Message) => void;
  updateMessage: (transactionId: string, tempId: string, realMessage: Message) => void;
  removeMessage: (transactionId: string, messageId: string) => void;
  setConnected: (connected: boolean) => void;
  getMessages: (transactionId: string) => Message[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  isConnected: false,

  setMessages: (transactionId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [transactionId]: messages,
      },
    }));
  },

  addMessage: (transactionId, message) => {
    set((state) => {
      const current = state.messages[transactionId] || [];
      
      // Check for duplicates by ID
      if (current.some(m => m.id === message.id)) {
        return state;
      }
      
      return {
        messages: {
          ...state.messages,
          [transactionId]: [...current, message],
        },
      };
    });
  },

  updateMessage: (transactionId, tempId, realMessage) => {
    set((state) => {
      const current = state.messages[transactionId] || [];
      
      // Remove temp message and check if real message already exists
      const filtered = current.filter(m => m.id !== tempId && m.id !== realMessage.id);
      
      return {
        messages: {
          ...state.messages,
          [transactionId]: [...filtered, { ...realMessage, status: 'sent' }],
        },
      };
    });
  },

  removeMessage: (transactionId, messageId) => {
    set((state) => {
      const current = state.messages[transactionId] || [];
      return {
        messages: {
          ...state.messages,
          [transactionId]: current.filter(m => m.id !== messageId),
        },
      };
    });
  },

  setConnected: (connected) => set({ isConnected: connected }),

  getMessages: (transactionId) => get().messages[transactionId] || [],
}));
