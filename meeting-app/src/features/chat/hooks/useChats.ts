import { useQuery } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";

export const useChats = () => {
  return useQuery({
    queryKey: ["chats"],
    queryFn: chatApi.getChats,
  });
};
