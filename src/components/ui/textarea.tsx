import * as React from "react";

import { cn } from "@/lib/utils";
import { MarkdownText } from "@/components/ui/MarkdownText";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  markdownPreview?: boolean;
  previewClassName?: string;
  markdownPreviewValue?: string;
  containerClassName?: string;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, markdownPreview, previewClassName, markdownPreviewValue, containerClassName, value, defaultValue, onChange, onInput, ...props },
    ref
  ) => {
    const initial = (typeof value === "string"
      ? value
      : typeof defaultValue === "string"
      ? defaultValue
      : "") as string;

    const [internalPreview, setInternalPreview] = React.useState<string>(initial);

    React.useEffect(() => {
      if (typeof value === "string") {
        setInternalPreview(value);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (markdownPreview) setInternalPreview(e.target.value);
      onChange?.(e);
    };

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (markdownPreview) setInternalPreview((e.target as HTMLTextAreaElement).value);
      onInput?.(e);
    };

    // Derivamos el texto a previsualizar con prioridad:
    // prop markdownPreviewValue > prop value > estado interno
    const previewText = (typeof markdownPreviewValue === "string"
      ? markdownPreviewValue
      : typeof value === "string"
      ? value
      : internalPreview) as string | undefined;

    return (
      <div className={cn("flex flex-col gap-2", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onInput={handleInput}
          {...props}
        />
        {markdownPreview && (
          <MarkdownText
            text={previewText}
            className={cn(
              "rounded-md border bg-white/60 px-3 py-2 text-sm leading-relaxed text-gray-800",
              previewClassName
            )}
          />
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
