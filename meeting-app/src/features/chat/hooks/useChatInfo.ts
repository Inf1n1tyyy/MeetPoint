import { useQuery } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";

export const useChatInfo = (chatId: string) => {
  return useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => chatApi.getChat(chatId),
    enabled: Boolean(chatId),
  });
};
