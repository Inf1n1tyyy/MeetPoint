import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "../api/meetings.api";
import type { CreateMeetingPayload } from "../types/meetingTypes";

export const useCreateMeeting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMeetingPayload) => meetingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};
