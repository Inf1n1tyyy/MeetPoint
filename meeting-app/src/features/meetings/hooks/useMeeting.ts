import { useQuery } from "@tanstack/react-query";
import { meetingsApi } from "../api/meetings.api";

export const useMeeting = (id: string) => {
  return useQuery({
    queryKey: ["meeting", id],
    queryFn: () => meetingsApi.getById(id),
    enabled: Boolean(id),
  });
};
