"use client";

import { EventForm } from "@/components/schedule/EventForm";
import { EventDetailDialog } from "@/components/schedule/EventDetailDialog";
import { DeleteEventDialog } from "@/components/schedule/DeleteEventDialog";
import type { ScheduleCourseOption, ScheduleDraft, ScheduleEvent } from "@/types/schedule";

interface ScheduleDialogsProps {
  courses: ScheduleCourseOption[];
  formOpen: boolean;
  draft: ScheduleDraft | null;
  defaultDate: string | undefined;
  onSubmit: (draft: ScheduleDraft) => Promise<void>;
  onCloseForm: () => void;
  detail: ScheduleEvent | null;
  onCloseDetail: () => void;
  onEdit: (event: ScheduleEvent) => void;
  onRequestDelete: (event: ScheduleEvent) => void;
  deleteEvent: ScheduleEvent | null;
  onCancelDelete: () => void;
  onConfirmDelete: (event: ScheduleEvent) => void;
}

/** The schedule screen's three dialogs. Only one is ever open at a time. */
export function ScheduleDialogs(props: ScheduleDialogsProps) {
  const {
    courses,
    formOpen,
    draft,
    defaultDate,
    onSubmit,
    onCloseForm,
    detail,
    onCloseDetail,
    onEdit,
    onRequestDelete,
    deleteEvent,
    onCancelDelete,
    onConfirmDelete,
  } = props;

  return (
    <>
      <EventForm
        open={formOpen}
        initialDraft={draft}
        courses={courses}
        defaultDate={defaultDate}
        onClose={onCloseForm}
        onSubmit={onSubmit}
      />
      {detail && (
        <EventDetailDialog
          event={detail}
          onClose={onCloseDetail}
          onEdit={onEdit}
          onDelete={onRequestDelete}
        />
      )}
      {deleteEvent && (
        <DeleteEventDialog
          title={deleteEvent.title}
          onCancel={onCancelDelete}
          onConfirm={() => onConfirmDelete(deleteEvent)}
        />
      )}
    </>
  );
}