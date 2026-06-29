import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";

const PAGE_SIZE = 20;

export const useUsers = (search = "", page = 1) => {
  return useQuery({
    queryKey: ["users", search, page],
    queryFn: () => usersApi.getAll({ search, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
};
