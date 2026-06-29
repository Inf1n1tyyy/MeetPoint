import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { meetingsApi } from "../api/meetings.api";
import type { MeetingFilters } from "../types/meetingTypes";

export const useMeetings = (filters: MeetingFilters = {}) => {
  return useQuery({
    queryKey: ["meetings", filters],
    queryFn: () => meetingsApi.getAll(filters),
    placeholderData: keepPreviousData,
  });
};
