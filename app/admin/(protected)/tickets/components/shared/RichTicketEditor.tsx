"use client";

import { type ClipboardEvent, type DragEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Bold, ImageIcon, Italic, LinkIcon, List, ListOrdered, Quote, Underline as UnderlineIcon } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { cn } from "@/app/shared/lib/utils";

interface RichTicketEditorProps {
  value: string;
  disabled?: boolean;
  onChange: (html: string, text: string, hasMedia: boolean) => void;
}

interface ToolbarButtonProps {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

type InlineMark = "bold" | "italic" | "underline";

type EmptyInlineMarkState = Record<InlineMark, boolean>;

const emptyInlineMarks: EmptyInlineMarkState = {
  bold: false,
  italic: false,
  underline: false,
};

function normalizeEditorHtml(html: string): string {
  const trimmed = html.trim();
  return trimmed === "<p></p>" ? "" : trimmed;
}

function editorHasMedia(editor: Editor): boolean {
  let hasMedia = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "image") {
      hasMedia = true;
      return false;
    }
    return true;
  });
  return hasMedia;
}

function emitEditorChange(editor: Editor, onChange: RichTicketEditorProps["onChange"]) {
  onChange(normalizeEditorHtml(editor.getHTML()), editor.getText().trim(), editorHasMedia(editor));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function createEditorImageDataUrl(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = new window.Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Image could not be loaded"));
    image.src = dataUrl;
  });

  const maxWidth = 1200;
  if (image.width <= maxWidth) return dataUrl;

  const scale = maxWidth / image.width;
  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.84);
}

function normalizeHref(value: string): string {
  const trimmed = value.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ToolbarButton({ title, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border border-transparent text-text-body transition-colors hover:bg-customer-card",
        active && "border-brand-blue/35 bg-customer-blue text-brand-blue shadow-[0_0_0_0.104vw_rgba(33,84,239,0.08)] hover:bg-customer-blue",
      )}
    >
      {children}
    </Button>
  );
}

export function RichTicketEditor({ value, disabled = false, onChange }: RichTicketEditorProps) {
  const [, setToolbarTick] = useState(0);
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [emptyActiveMarks, setEmptyActiveMarks] = useState<EmptyInlineMarkState>(emptyInlineMarks);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        allowBase64: true,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "min-h-[8vw] w-full cursor-text overflow-y-auto px-[0.833vw] py-[0.729vw] text-[clamp(14px,0.84vw,16px)] font-normal leading-relaxed text-text-primary outline-none max-lg:min-h-[34vw] max-lg:px-[3.5vw] max-lg:py-[3vw] max-lg:text-[3.5vw] [&_a]:font-semibold [&_a]:text-brand-blue [&_blockquote]:border-l-[0.208vw] [&_blockquote]:border-brand-blue [&_blockquote]:pl-[0.833vw] [&_blockquote]:text-text-body [&_img]:my-[0.625vw] [&_img]:max-h-[20vw] [&_img]:max-w-full [&_img]:rounded-[0.625vw] [&_li]:ml-[1.25vw] [&_li]:font-normal [&_li_p]:mb-0 [&_ol]:list-decimal [&_p]:mb-[0.625vw] [&_p]:font-normal [&_strong]:font-semibold [&_ul]:list-disc max-lg:[&_blockquote]:pl-[3vw] max-lg:[&_img]:max-h-[80vw] max-lg:[&_li]:ml-[5vw]",
      },
    },
    onCreate: ({ editor: createdEditor }) => {
      emitEditorChange(createdEditor, onChange);
    },
    onUpdate: ({ editor: updatedEditor }) => {
      if (!updatedEditor.isEmpty) {
        setEmptyActiveMarks(emptyInlineMarks);
      }
      emitEditorChange(updatedEditor, onChange);
    },
    onSelectionUpdate: () => setToolbarTick((tick) => tick + 1),
    onTransaction: () => setToolbarTick((tick) => tick + 1),
    onFocus: () => setToolbarTick((tick) => tick + 1),
    onBlur: () => setToolbarTick((tick) => tick + 1),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const nextHtml = normalizeEditorHtml(value);
    const currentHtml = normalizeEditorHtml(editor.getHTML());
    if (nextHtml !== currentHtml) {
      editor.commands.setContent(nextHtml, { emitUpdate: false });
    }
  }, [editor, value]);

  const insertImages = useCallback(async (files: File[]) => {
    if (!editor || disabled) return;
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;

    setIsAddingImage(true);
    try {
      for (const imageFile of images) {
        const dataUrl = await createEditorImageDataUrl(imageFile);
        editor.chain().focus().setImage({ src: dataUrl, alt: imageFile.name || "Screenshot" }).run();
      }
    } finally {
      setIsAddingImage(false);
    }
  }, [disabled, editor]);

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (files.some((file) => file.type.startsWith("image/"))) {
      event.preventDefault();
      void insertImages(files);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    event.preventDefault();
    void insertImages(files);
  };

  const handleLink = () => {
    if (!editor || disabled) return;
    const currentHref = typeof editor.getAttributes("link").href === "string" ? editor.getAttributes("link").href : "";
    const rawUrl = window.prompt("Paste link URL", currentHref);
    if (rawUrl === null) return;

    if (!rawUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: normalizeHref(rawUrl) }).run();
  };

  const isInlineMarkActive = (mark: InlineMark): boolean => {
    if (!editor) return false;
    return editor.isEmpty ? emptyActiveMarks[mark] : editor.isActive(mark);
  };

  const toggleInlineMark = (mark: InlineMark) => {
    if (!editor || disabled) return;
    const nextEmptyState = !isInlineMarkActive(mark);

    if (mark === "bold") {
      editor.chain().focus().toggleBold().run();
    }
    if (mark === "italic") {
      editor.chain().focus().toggleItalic().run();
    }
    if (mark === "underline") {
      editor.chain().focus().toggleUnderline().run();
    }

    if (editor.isEmpty) {
      setEmptyActiveMarks((current) => ({
        ...current,
        [mark]: nextEmptyState,
      }));
    }
  };

  const isDisabled = disabled || !editor;

  return (
    <div className="overflow-hidden rounded-[0.833vw] border border-customer-border bg-customer-card max-lg:rounded-[3.5vw]">
      <div className="flex flex-wrap items-center gap-[0.313vw] border-b border-customer-border bg-customer-soft px-[0.521vw] py-[0.417vw] max-lg:gap-[1vw] max-lg:px-[2vw] max-lg:py-[2vw]">
        <ToolbarButton title="Bold" active={isInlineMarkActive("bold")} disabled={isDisabled} onClick={() => toggleInlineMark("bold")}>
          <Bold className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={isInlineMarkActive("italic")} disabled={isDisabled} onClick={() => toggleInlineMark("italic")}>
          <Italic className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={isInlineMarkActive("underline")} disabled={isDisabled} onClick={() => toggleInlineMark("underline")}>
          <UnderlineIcon className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </ToolbarButton>
        <ToolbarButton title="Bulleted list" active={Boolean(editor?.isActive("bulletList"))} disabled={isDisabled} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={Boolean(editor?.isActive("orderedList"))} disabled={isDisabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </ToolbarButton>
        <ToolbarButton title="Quote" active={Boolean(editor?.isActive("blockquote"))} disabled={isDisabled} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </ToolbarButton>
        <ToolbarButton title="Link" active={Boolean(editor?.isActive("link"))} disabled={isDisabled} onClick={handleLink}>
          <LinkIcon className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </ToolbarButton>
        <ToolbarButton title="Image" disabled={isDisabled || isAddingImage} onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            void insertImages(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      <div className="relative" onPaste={handlePaste} onDrop={handleDrop}>
        {editor?.isEmpty ? (
          <p className="pointer-events-none absolute left-[0.833vw] top-[0.729vw] text-[clamp(14px,0.84vw,16px)] font-normal text-customer-muted max-lg:left-[3.5vw] max-lg:top-[3vw] max-lg:text-[3.5vw]">
            Write an answer...
          </p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
