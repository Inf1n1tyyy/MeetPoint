import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";
import type { ChatMessage } from "../types/chatTypes";

export const useSendMessage = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => chatApi.sendMessage(chatId, text),
    onSuccess: (message: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(["chat", chatId, "messages"], (old = []) => {
        if (old.some((item) => item.id === message.id)) return old;
        return [...old, message];
      });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};
