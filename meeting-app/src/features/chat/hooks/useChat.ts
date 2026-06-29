import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";
import type { ChatMessage } from "../types/chatTypes";

const mergeMessages = (oldMessages: ChatMessage[] = [], message: ChatMessage) => {
  if (oldMessages.some((item) => item.id === message.id)) return oldMessages;
  return [...oldMessages, message];
};

export const useChat = (chatId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat", chatId, "messages"],
    queryFn: () => chatApi.getMessages(chatId),
    enabled: Boolean(chatId),
  });

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = chatApi.subscribe((message) => {
      if (message.chatId !== chatId) return;

      queryClient.setQueryData<ChatMessage[]>(["chat", chatId, "messages"], (old) => {
        return mergeMessages(old, message);
      });

      queryClient.invalidateQueries({ queryKey: ["chats"] });
    });

    return unsubscribe;
  }, [chatId, queryClient]);

  return query;
};
