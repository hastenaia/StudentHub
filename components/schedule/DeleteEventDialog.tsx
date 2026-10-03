"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteEventDialogProps {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteEventDialog({ title, onCancel, onConfirm }: DeleteEventDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="font-semibold text-brand-dark">Delete event?</h3>
        </div>
        <p className="mb-6 text-sm text-gray-600">
          This will permanently delete <span className="font-medium text-gray-700">{title}</span>.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}