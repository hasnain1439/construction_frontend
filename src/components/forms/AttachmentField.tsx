"use client";

import { Controller, useFormContext } from "react-hook-form";
import type { AttachmentKind } from "@/api/types";
import { FileUpload, type UploadedFile } from "@/components/common/FileUpload";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export type { UploadedFile };

/**
 * Upload bound to a form field holding `UploadedFile | null` (id + preview). The kind
 * decides which files the backend accepts (CHALLAN, SITE_PHOTO, RECEIPT …); submit
 * handlers send `field.id`.
 */
export function AttachmentField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  kind,
  uploadLabel,
}: BaseFieldProps & { kind: AttachmentKind; uploadLabel?: string }) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} error={error} className={className} hideLabel={hideLabel}>
      {({ id, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <FileUpload
              id={id}
              kind={kind}
              value={(field.value as UploadedFile | null | undefined) ?? null}
              onChange={(file) => field.onChange(file)}
              invalid={invalid}
              disabled={disabled}
              label={uploadLabel}
              hint={typeof hint === "string" ? hint : undefined}
            />
          )}
        />
      )}
    </FormField>
  );
}

/** id of an uploaded file, or undefined (for optional attachment ids in request bodies). */
export const attachmentId = (file: UploadedFile | null | undefined) => file?.id ?? undefined;
