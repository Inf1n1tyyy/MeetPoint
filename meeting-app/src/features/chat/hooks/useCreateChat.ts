import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";
import type { CreateChatPayload } from "../types/chatTypes";

export const useCreateChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChatPayload) => chatApi.createChat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};
