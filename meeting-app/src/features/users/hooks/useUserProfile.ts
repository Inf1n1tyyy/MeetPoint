import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";

export const useUserProfile = (id: string) => {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getById(id),
    enabled: Boolean(id),
  });
};
