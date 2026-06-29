import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";

export const useFriendRequests = () => {
  return useQuery({
    queryKey: ["friend-requests", "incoming"],
    queryFn: usersApi.getIncomingFriendRequests,
  });
};
