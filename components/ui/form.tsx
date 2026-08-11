"use client";

import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

const Form = FormProvider;

type FormFieldContextValue = { name: string };
const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);
const FormItemContext = React.createContext<string | null>(null);

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField must be used within a <FormField>");
  }
  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    id: itemContext ?? undefined,
    name: fieldContext.name,
    fieldState,
  };
}

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  render,
}: {
  name: TName;
  render: (args: {
    field: ControllerRenderProps<TFieldValues, TName>;
    fieldState: ControllerFieldState;
  }) => React.ReactElement;
}) {
  return (
    <FormFieldContext.Provider value={{ name: name as string }}>
      <Controller<TFieldValues, TName>
        name={name}
        render={({ field, fieldState }) => render({ field, fieldState })}
      />
    </FormFieldContext.Provider>
  );
}

function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={id}>
      <div className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { id, fieldState } = useFormField();
  return (
    <Label
      htmlFor={id}
      className={cn(fieldState.error && "text-red-500", className)}
      {...props}
    />
  );
}

function FormControl({ children }: { children: React.ReactElement }) {
  const { id, fieldState } = useFormField();
  return React.cloneElement(children, {
    id,
    error: !!fieldState.error,
  });
}

function FormMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { id, fieldState } = useFormField();
  if (!fieldState.error) return null;
  return (
    <p id={id} className={cn("text-sm text-red-500", className)} {...props}>
      {children ?? fieldState.error?.message}
    </p>
  );
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage };
