import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";

export const useFriends = () => {
  return useQuery({
    queryKey: ["friends"],
    queryFn: usersApi.getFriends,
  });
};
