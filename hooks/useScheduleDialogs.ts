"use client";

import * as React from "react";
import type { ScheduleEvent } from "@/types/schedule";

/**
 * Dialog state for the schedule screen: the create/edit form, the read-only detail dialog and
 * the delete confirmation. Keeping it here means `ScheduleView` only decides *what* is open.
 */
export function useScheduleDialogs(currentDate: Date) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ScheduleEvent | null>(null);
  const [defaultDate, setDefaultDate] = React.useState<string | undefined>(undefined);
  const [detailEvent, setDetailEvent] = React.useState<ScheduleEvent | null>(null);
  const [deleteEvent, setDeleteEvent] = React.useState<ScheduleEvent | null>(null);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setDefaultDate(undefined);
  };

  const openCreate = (date?: Date | string) => {
    setEditing(null);
    setDefaultDate(date instanceof Date ? date.toISOString() : (date ?? currentDate.toISOString()));
    setFormOpen(true);
  };

  const openEdit = (event: ScheduleEvent) => {
    // Google events and task deadlines are read-only, so refuse to open the form for them.
    if (event.source !== "user") return;
    setEditing(event);
    setDetailEvent(null);
    setFormOpen(true);
  };

  const closeDetail = () => setDetailEvent(null);

  const cancelDelete = () => setDeleteEvent(null);

  return {
    formOpen,
    editing,
    defaultDate,
    detailEvent,
    deleteEvent,
    openForm: setFormOpen,
    openCreate,
    openEdit,
    closeForm,
    openDetail: setDetailEvent,
    closeDetail,
    requestDelete: setDeleteEvent,
    cancelDelete,
    dismissAll: () => {
      closeForm();
      setDetailEvent(null);
      setDeleteEvent(null);
    },
  };
}