"use client";

import { useEffect, useRef, useState } from "react";
import type { PdpStudioLocalFile } from "../types";

export function useBatchWorkspaceUi() {
  const [files, setFiles] = useState<PdpStudioLocalFile[]>([]);
  const [selectedBackground, setSelectedBackground] = useState("essential-transparent");
  const objectUrls = useRef<string[]>([]);

  useEffect(
    () => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );

  function addFiles(incoming: File[]): void {
    const localFiles = incoming.slice(0, 12).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));
    objectUrls.current.push(...localFiles.map((file) => file.previewUrl));
    setFiles(localFiles);
  }

  return {
    files,
    selectedBackground,
    addFiles,
    setSelectedBackground,
  };
}
