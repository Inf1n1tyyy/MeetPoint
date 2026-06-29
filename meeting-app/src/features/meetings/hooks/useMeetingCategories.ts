import { useQuery } from "@tanstack/react-query";
import { meetingsApi } from "../api/meetings.api";

export const useMeetingCategories = () => {
  return useQuery({
    queryKey: ["meeting-categories"],
    queryFn: meetingsApi.getCategories,
  });
};
