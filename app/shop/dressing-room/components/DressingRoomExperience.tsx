"use client";

import {
  ArrowCounterClockwise,
  ArrowLeft,
  CaretLeft,
  CaretRight,
  Check,
  Copy,
  CornersOut,
  Hand,
  Minus,
  Plus,
  Resize,
  SidebarSimple,
  Sparkle,
  Stack,
  Trash,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import {
  dressingRoomCatalog,
  dressingRoomCategories,
  initialDressingRoomCanvasItems,
} from "../data/dressingRoom.data";
import type {
  DressingRoomCanvasItem,
  DressingRoomCatalogItem,
  DressingRoomCategory,
  DressingRoomGender,
} from "../data/dressingRoom.data";
import styles from "./dressingRoom.module.css";

type Camera = {
  x: number;
  y: number;
  scale: number;
};

type CanvasInteraction =
  | {
      type: "pan";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startCamera: Camera;
    }
  | {
      type: "item";
      pointerId: number;
      instanceId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      type: "resize";
      pointerId: number;
      instanceId: string;
      startClientX: number;
      startClientY: number;
      startWidth: number;
    };

type CatalogDrag = {
  pointerId: number;
  productId: string;
  startClientX: number;
  startClientY: number;
  clientX: number;
  clientY: number;
  moved: boolean;
};

type ItemPointer = {
  instanceId: string;
  clientX: number;
  clientY: number;
};

type ItemPinch = {
  instanceId: string;
  pointerIds: [number, number];
  startDistance: number;
  startAngle: number;
  startWidth: number;
  startRotation: number;
};

const catalogById = new Map(
  dressingRoomCatalog.map((item) => [item.id, item]),
);

const MIN_CANVAS_SCALE = 0.35;
const MAX_CANVAS_SCALE = 2.2;
const MIN_ITEM_WIDTH = 64;
const MAX_ITEM_WIDTH = 520;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function subscribeToCompactViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(max-width: 760px)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getCompactViewportSnapshot() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function getCompactViewportServerSnapshot() {
  return false;
}

export function DressingRoomExperience() {
  const [gender, setGender] = useState<DressingRoomGender>("Women");
  const [category, setCategory] = useState<DressingRoomCategory>("All");
  const [libraryCollapsedPreference, setLibraryCollapsedPreference] = useState<
    boolean | null
  >(null);
  const [inspectorCollapsedPreference, setInspectorCollapsedPreference] =
    useState<boolean | null>(null);
  const [items, setItems] = useState<DressingRoomCanvasItem[]>(() =>
    initialDressingRoomCanvasItems.map((item) => ({ ...item })),
  );
  const [selectedId, setSelectedId] = useState<string | null>("starter-trench");
  const [camera, setCamera] = useState<Camera>({ x: 420, y: 300, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [catalogDragPreview, setCatalogDragPreview] =
    useState<CatalogDrag | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const catalogDragRef = useRef<CatalogDrag | null>(null);
  const suppressCatalogClickRef = useRef(false);
  const activeItemPointersRef = useRef<Map<number, ItemPointer>>(new Map());
  const itemPinchRef = useRef<ItemPinch | null>(null);
  const nextInstanceRef = useRef(1);
  const initialFitCompleteRef = useRef(false);
  const hasRenderedItemsRef = useRef(false);
  const compactViewport = useSyncExternalStore(
    subscribeToCompactViewport,
    getCompactViewportSnapshot,
    getCompactViewportServerSnapshot,
  );
  const libraryCollapsed = libraryCollapsedPreference ?? compactViewport;
  const inspectorCollapsed = inspectorCollapsedPreference ?? compactViewport;

  const filteredCatalog = useMemo(
    () =>
      dressingRoomCatalog.filter(
        (item) =>
          item.genders.includes(gender) &&
          (category === "All" || item.category === category),
      ),
    [category, gender],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<DressingRoomCategory, number>();
    for (const nextCategory of dressingRoomCategories) {
      counts.set(
        nextCategory,
        dressingRoomCatalog.filter(
          (item) =>
            item.genders.includes(gender) &&
            (nextCategory === "All" || item.category === nextCategory),
        ).length,
      );
    }
    return counts;
  }, [gender]);

  const selectedCanvasItem = useMemo(
    () => items.find((item) => item.instanceId === selectedId) ?? null,
    [items, selectedId],
  );
  const selectedCatalogItem = selectedCanvasItem
    ? catalogById.get(selectedCanvasItem.catalogId) ?? null
    : null;

  const lookTotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + (catalogById.get(item.catalogId)?.price ?? 0),
        0,
      ),
    [items],
  );

  const fitItemsInViewport = useCallback(
    (targetItems: DressingRoomCanvasItem[]) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();

      if (targetItems.length === 0) {
        setCamera({ x: rect.width / 2, y: rect.height / 2, scale: 1 });
        return;
      }

      const bounds = targetItems.reduce(
        (current, item) => {
          const product = catalogById.get(item.catalogId);
          const height = product
            ? item.width / product.aspectRatio
            : item.width;
          return {
            minX: Math.min(current.minX, item.x - item.width / 2),
            maxX: Math.max(current.maxX, item.x + item.width / 2),
            minY: Math.min(current.minY, item.y - height / 2),
            maxY: Math.max(current.maxY, item.y + height / 2),
          };
        },
        {
          minX: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        },
      );

      const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
      const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
      const compactLayout = rect.width <= 820;
      const leftInset = compactLayout && libraryCollapsed ? 56 : 0;
      const rightInset = compactLayout && inspectorCollapsed ? 52 : 0;
      const usableWidth = rect.width - leftInset - rightInset;
      const padding = rect.width < 620 ? 48 : 130;
      const nextScale = clamp(
        Math.min(
          (usableWidth - padding) / contentWidth,
          (rect.height - padding) / contentHeight,
        ),
        MIN_CANVAS_SCALE,
        1.15,
      );
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      setCamera({
        x: leftInset + usableWidth / 2 - centerX * nextScale,
        y: rect.height / 2 - centerY * nextScale,
        scale: nextScale,
      });
    },
    [inspectorCollapsed, libraryCollapsed],
  );

  const fitCanvas = useCallback(() => {
    fitItemsInViewport(items);
  }, [fitItemsInViewport, items]);

  useEffect(() => {
    if (initialFitCompleteRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      fitCanvas();
      initialFitCompleteRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitCanvas]);

  useEffect(() => {
    if (hasRenderedItemsRef.current) setSaved(false);
    hasRenderedItemsRef.current = true;
  }, [items]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        setSpacePressed(true);
      }
      if (event.key === "Escape") setSelectedId(null);
      if ((event.key === "Backspace" || event.key === "Delete") && selectedId) {
        event.preventDefault();
        setItems((current) =>
          current.filter((item) => item.instanceId !== selectedId),
        );
        setSelectedId(null);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setSpacePressed(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedId]);

  function addCatalogItem(
    product: DressingRoomCatalogItem,
    position?: { x: number; y: number },
  ) {
    const viewport = viewportRef.current;
    const sequence = nextInstanceRef.current++;
    let x = position?.x;
    let y = position?.y;

    if ((x === undefined || y === undefined) && viewport) {
      const rect = viewport.getBoundingClientRect();
      x = (rect.width / 2 - camera.x) / camera.scale + (sequence % 3) * 22;
      y = (rect.height / 2 - camera.y) / camera.scale + (sequence % 2) * 18;
    }

    const instanceId = `${product.id}-${sequence}`;
    setItems((current) => [
      ...current,
      {
        instanceId,
        catalogId: product.id,
        x: x ?? 0,
        y: y ?? 0,
        width: product.defaultWidth,
        rotation: 0,
        z: Math.max(0, ...current.map((item) => item.z)) + 1,
      },
    ]);
    setSelectedId(instanceId);
  }

  function handleCatalogPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    product: DressingRoomCatalogItem,
  ) {
    if (event.button !== 0) return;
    const drag: CatalogDrag = {
      pointerId: event.pointerId,
      productId: product.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false,
    };
    catalogDragRef.current = drag;
    setCatalogDragPreview(drag);
  }

  function handleCatalogPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = catalogDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - drag.startClientX,
      event.clientY - drag.startClientY,
    );
    const nextDrag = {
      ...drag,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: drag.moved || distance > 6,
    };
    catalogDragRef.current = nextDrag;
    setCatalogDragPreview(nextDrag);
    if (nextDrag.moved) event.preventDefault();
  }

  function handleCatalogPointerEnd(event: ReactPointerEvent<HTMLElement>) {
    const drag = catalogDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      suppressCatalogClickRef.current = true;
      const viewport = viewportRef.current;
      const product = catalogById.get(drag.productId);
      if (viewport && product) {
        const rect = viewport.getBoundingClientRect();
        const droppedInside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;
        if (droppedInside) {
          addCatalogItem(product, {
            x: (event.clientX - rect.left - camera.x) / camera.scale,
            y: (event.clientY - rect.top - camera.y) / camera.scale,
          });
        }
      }
    }

    catalogDragRef.current = null;
    setCatalogDragPreview(null);
  }

  function handleCatalogPointerCancel() {
    catalogDragRef.current = null;
    setCatalogDragPreview(null);
  }

  function bringToFront(instanceId: string) {
    setItems((current) => {
      const topZ = Math.max(0, ...current.map((item) => item.z));
      return current.map((item) =>
        item.instanceId === instanceId ? { ...item, z: topZ + 1 } : item,
      );
    });
  }

  function sendToBack(instanceId: string) {
    setItems((current) => {
      const bottomZ = Math.min(0, ...current.map((item) => item.z));
      return current.map((item) =>
        item.instanceId === instanceId ? { ...item, z: bottomZ - 1 } : item,
      );
    });
  }

  function duplicateSelected() {
    if (!selectedCanvasItem) return;
    const instanceId = `${selectedCanvasItem.catalogId}-${nextInstanceRef.current++}`;
    setItems((current) => [
      ...current,
      {
        ...selectedCanvasItem,
        instanceId,
        x: selectedCanvasItem.x + 28,
        y: selectedCanvasItem.y + 28,
        z: Math.max(0, ...current.map((item) => item.z)) + 1,
      },
    ]);
    setSelectedId(instanceId);
  }

  function removeSelected() {
    if (!selectedId) return;
    setItems((current) =>
      current.filter((item) => item.instanceId !== selectedId),
    );
    setSelectedId(null);
  }

  function updateSelected(patch: Partial<DressingRoomCanvasItem>) {
    if (!selectedId) return;
    setItems((current) =>
      current.map((item) =>
        item.instanceId === selectedId ? { ...item, ...patch } : item,
      ),
    );
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    setSelectedId(null);
    setIsPanning(true);
    interactionRef.current = {
      type: "pan",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCamera: camera,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleItemPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    item: DressingRoomCanvasItem,
  ) {
    if (event.button !== 0) return;
    if (spacePressed) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.instanceId);
    bringToFront(item.instanceId);
    activeItemPointersRef.current.set(event.pointerId, {
      instanceId: item.instanceId,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    const matchingPointers = Array.from(
      activeItemPointersRef.current.entries(),
    ).filter(([, pointer]) => pointer.instanceId === item.instanceId);

    if (matchingPointers.length >= 2) {
      const [first, second] = matchingPointers.slice(-2);
      const deltaX = second[1].clientX - first[1].clientX;
      const deltaY = second[1].clientY - first[1].clientY;
      itemPinchRef.current = {
        instanceId: item.instanceId,
        pointerIds: [first[0], second[0]],
        startDistance: Math.max(Math.hypot(deltaX, deltaY), 1),
        startAngle: Math.atan2(deltaY, deltaX),
        startWidth: item.width,
        startRotation: item.rotation,
      };
      interactionRef.current = null;
    } else {
      interactionRef.current = {
        type: "item",
        pointerId: event.pointerId,
        instanceId: item.instanceId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: item.x,
        startY: item.y,
      };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: DressingRoomCanvasItem,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.instanceId);
    interactionRef.current = {
      type: "resize",
      pointerId: event.pointerId,
      instanceId: item.instanceId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: item.width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const activeItemPointer = activeItemPointersRef.current.get(event.pointerId);
    if (activeItemPointer) {
      activeItemPointersRef.current.set(event.pointerId, {
        ...activeItemPointer,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }

    const pinch = itemPinchRef.current;
    if (pinch && pinch.pointerIds.includes(event.pointerId)) {
      const first = activeItemPointersRef.current.get(pinch.pointerIds[0]);
      const second = activeItemPointersRef.current.get(pinch.pointerIds[1]);
      if (first && second) {
        const deltaX = second.clientX - first.clientX;
        const deltaY = second.clientY - first.clientY;
        const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
        const angle = Math.atan2(deltaY, deltaX);
        const angleDelta = Math.atan2(
          Math.sin(angle - pinch.startAngle),
          Math.cos(angle - pinch.startAngle),
        );
        setItems((current) =>
          current.map((item) =>
            item.instanceId === pinch.instanceId
              ? {
                  ...item,
                  width: clamp(
                    pinch.startWidth * (distance / pinch.startDistance),
                    MIN_ITEM_WIDTH,
                    MAX_ITEM_WIDTH,
                  ),
                  rotation:
                    pinch.startRotation + (angleDelta * 180) / Math.PI,
                }
              : item,
          ),
        );
      }
      return;
    }

    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - interaction.startClientX;
    const deltaY = event.clientY - interaction.startClientY;

    if (interaction.type === "pan") {
      setCamera({
        ...interaction.startCamera,
        x: interaction.startCamera.x + deltaX,
        y: interaction.startCamera.y + deltaY,
      });
      return;
    }

    if (interaction.type === "item") {
      setItems((current) =>
        current.map((item) =>
          item.instanceId === interaction.instanceId
            ? {
                ...item,
                x: interaction.startX + deltaX / camera.scale,
                y: interaction.startY + deltaY / camera.scale,
              }
            : item,
        ),
      );
      return;
    }

    const directionDelta = (deltaX + deltaY) / 2 / camera.scale;
    setItems((current) =>
      current.map((item) =>
        item.instanceId === interaction.instanceId
          ? {
              ...item,
              width: clamp(
                interaction.startWidth + directionDelta,
                MIN_ITEM_WIDTH,
                MAX_ITEM_WIDTH,
              ),
            }
          : item,
      ),
    );
  }

  function handleCanvasPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    activeItemPointersRef.current.delete(event.pointerId);
    const pinch = itemPinchRef.current;
    if (pinch?.pointerIds.includes(event.pointerId)) {
      itemPinchRef.current = null;
      interactionRef.current = null;
      setIsPanning(false);
      return;
    }

    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();

    if (event.ctrlKey || event.metaKey) {
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      setCamera((current) => {
        const worldX = (pointerX - current.x) / current.scale;
        const worldY = (pointerY - current.y) / current.scale;
        const nextScale = clamp(
          current.scale * Math.exp(-event.deltaY * 0.006),
          MIN_CANVAS_SCALE,
          MAX_CANVAS_SCALE,
        );
        return {
          x: pointerX - worldX * nextScale,
          y: pointerY - worldY * nextScale,
          scale: nextScale,
        };
      });
      return;
    }

    setCamera((current) => ({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  }

  function zoomCanvas(multiplier: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setCamera((current) => {
      const worldX = (centerX - current.x) / current.scale;
      const worldY = (centerY - current.y) / current.scale;
      const nextScale = clamp(
        current.scale * multiplier,
        MIN_CANVAS_SCALE,
        MAX_CANVAS_SCALE,
      );
      return {
        x: centerX - worldX * nextScale,
        y: centerY - worldY * nextScale,
        scale: nextScale,
      };
    });
  }

  function resetLook() {
    const resetItems = initialDressingRoomCanvasItems.map((item) => ({
      ...item,
    }));
    setItems(resetItems);
    setSelectedId("starter-trench");
    window.requestAnimationFrame(() => fitItemsInViewport(resetItems));
  }

  return (
    <main
      className={styles.page}
      onPointerMove={handleCatalogPointerMove}
      onPointerUp={handleCatalogPointerEnd}
      onPointerCancel={handleCatalogPointerCancel}
    >
      <header className={styles.header}>
        <Link className={styles.backLink} href="/shop">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Shop</span>
        </Link>

        <div className={styles.titleLockup}>
          <h1>Dressing Room</h1>
          <p>PrimeStyleAI · Global Shop</p>
        </div>

        <div className={styles.headerActions}>
          <span>{items.length} pieces</span>
          <button
            type="button"
            className={saved ? styles.savedButton : styles.saveButton}
            onClick={() => setSaved(true)}
          >
            {saved ? (
              <Check size={15} weight="bold" />
            ) : (
              <Sparkle size={15} weight="fill" />
            )}
            <span>{saved ? "Look saved" : "Save look"}</span>
          </button>
        </div>
      </header>

      <section
        className={`${styles.workspace} ${
          libraryCollapsed ? styles.libraryCollapsed : ""
        } ${inspectorCollapsed ? styles.inspectorCollapsed : ""}`}
      >
        <aside className={styles.library} aria-label="Clothing library">
          {libraryCollapsed ? (
            <div className={styles.collapsedLibraryRail}>
              <button
                type="button"
                aria-label="Expand clothing library"
                onClick={() => setLibraryCollapsedPreference(false)}
              >
                <CaretRight size={17} />
              </button>
              {(["Women", "Men"] as DressingRoomGender[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={gender === option ? styles.activeRailGender : ""}
                  aria-label={`Show ${option} clothing`}
                  onClick={() => {
                    setGender(option);
                    setCategory("All");
                  }}
                >
                  {option}
                </button>
              ))}
              <span>Library</span>
            </div>
          ) : (
            <>
              <div className={styles.libraryHeader}>
                <div className={styles.genderTabs}>
                  {(["Women", "Men"] as DressingRoomGender[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={gender === option ? styles.activeGender : ""}
                      onClick={() => {
                        setGender(option);
                        setCategory("All");
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.collapseButton}
                  aria-label="Collapse clothing library"
                  onClick={() => setLibraryCollapsedPreference(true)}
                >
                  <SidebarSimple size={18} />
                </button>
              </div>

              <nav className={styles.categoryList} aria-label="Clothing categories">
                {dressingRoomCategories.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={category === option ? styles.activeCategory : ""}
                    onClick={() => setCategory(option)}
                  >
                    <span>{option === "All" ? "View all" : option}</span>
                    <small>{categoryCounts.get(option) ?? 0}</small>
                  </button>
                ))}
              </nav>

              <div className={styles.librarySectionHeading}>
                <span>{category === "All" ? "Curated pieces" : category}</span>
                <small>Drag or tap to add</small>
              </div>

              <div className={styles.productGrid}>
                {filteredCatalog.map((product, productIndex) => (
                  <button
                    key={product.id}
                    type="button"
                    className={styles.productCard}
                    onPointerDown={(event) =>
                      handleCatalogPointerDown(event, product)
                    }
                    onClick={() => {
                      if (suppressCatalogClickRef.current) {
                        suppressCatalogClickRef.current = false;
                        return;
                      }
                      addCatalogItem(product);
                    }}
                    aria-label={`Add ${product.name} to the dressing canvas`}
                  >
                    <span className={styles.productImage}>
                      <Image
                        src={product.image}
                        alt=""
                        width={500}
                        height={Math.max(
                          1,
                          Math.round(500 / product.aspectRatio),
                        )}
                        sizes="112px"
                        draggable={false}
                        loading={productIndex < 4 ? "eager" : "lazy"}
                      />
                    </span>
                    <span className={styles.productMeta}>
                      <strong>{product.name}</strong>
                      <small>{formatPrice(product.price)}</small>
                    </span>
                    <span className={styles.addBadge} aria-hidden="true">
                      <Plus size={13} weight="bold" />
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        <div
          ref={viewportRef}
          className={`${styles.canvasViewport} ${
            isPanning || spacePressed ? styles.panning : ""
          }`}
          data-testid="dressing-canvas"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerEnd}
          onPointerCancel={handleCanvasPointerEnd}
          onWheel={handleCanvasWheel}
          aria-label="Infinite dressing canvas"
        >
          <div
            className={styles.canvasStatus}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span>Look 01</span>
            <small>Infinite canvas</small>
          </div>

          <div
            className={styles.canvasToolbar}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => zoomCanvas(0.84)}
            >
              <Minus size={15} />
            </button>
            <span>{Math.round(camera.scale * 100)}%</span>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => zoomCanvas(1.18)}
            >
              <Plus size={15} />
            </button>
            <i aria-hidden="true" />
            <button type="button" aria-label="Fit look in view" onClick={fitCanvas}>
              <CornersOut size={16} />
            </button>
          </div>

          <div
            className={styles.canvasWorld}
            style={{
              transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
            }}
          >
            {items.map((item, index) => {
              const product = catalogById.get(item.catalogId);
              if (!product) return null;
              const height = item.width / product.aspectRatio;
              const selected = item.instanceId === selectedId;
              return (
                <div
                  key={item.instanceId}
                  className={`${styles.canvasItem} ${
                    selected ? styles.selectedCanvasItem : ""
                  }`}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height,
                    zIndex: item.z,
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                  }}
                  data-instance-id={item.instanceId}
                  onPointerDown={(event) => handleItemPointerDown(event, item)}
                >
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes={`${Math.ceil(item.width * camera.scale)}px`}
                    draggable={false}
                    loading={
                      index < initialDressingRoomCanvasItems.length
                        ? "eager"
                        : "lazy"
                    }
                  />
                  {selected ? (
                    <>
                      <span className={styles.selectionLabel}>{product.name}</span>
                      <button
                        type="button"
                        className={styles.resizeHandle}
                        aria-label={`Resize ${product.name}`}
                        onPointerDown={(event) =>
                          handleResizePointerDown(event, item)
                        }
                      >
                        <Resize size={14} weight="bold" />
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          {items.length === 0 ? (
            <div className={styles.emptyCanvas}>
              <Sparkle size={22} weight="fill" />
              <strong>Start a new look</strong>
              <span>Drag a piece here from the library.</span>
            </div>
          ) : null}

          <div
            className={styles.canvasHint}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Hand size={14} />
            <span>Drag space to pan · Pinch pieces · ⌘ scroll to zoom</span>
          </div>
        </div>

        <aside className={styles.inspector} aria-label="Look inspector">
          {inspectorCollapsed ? (
            <div className={styles.collapsedInspectorRail}>
              <button
                type="button"
                aria-label="Expand look inspector"
                onClick={() => setInspectorCollapsedPreference(false)}
              >
                <CaretLeft size={17} />
              </button>
              <span>Edit look</span>
              <small>{items.length}</small>
            </div>
          ) : (
            <>
              <div className={styles.inspectorHeader}>
                <div>
                  <span>Selected piece</span>
                  <small>{selectedCatalogItem ? "Edit" : "None"}</small>
                </div>
                <button
                  type="button"
                  aria-label="Collapse look inspector"
                  onClick={() => setInspectorCollapsedPreference(true)}
                >
                  <CaretRight size={17} />
                </button>
              </div>

              {selectedCatalogItem && selectedCanvasItem ? (
                <div className={styles.selectedProductPanel}>
                  <div className={styles.inspectorImage}>
                    <Image
                      src={selectedCatalogItem.image}
                      alt={selectedCatalogItem.name}
                      fill
                      sizes="190px"
                      loading="eager"
                    />
                  </div>
                  <div className={styles.selectedProductTitle}>
                    <div>
                      <small>{selectedCatalogItem.brand}</small>
                      <h2>{selectedCatalogItem.name}</h2>
                    </div>
                    <strong>{formatPrice(selectedCatalogItem.price)}</strong>
                  </div>

                  <dl className={styles.productFacts}>
                    <div>
                      <dt>Color</dt>
                      <dd>{selectedCatalogItem.color}</dd>
                    </div>
                    <div>
                      <dt>Scale</dt>
                      <dd>{Math.round((selectedCanvasItem.width / selectedCatalogItem.defaultWidth) * 100)}%</dd>
                    </div>
                  </dl>

                  <div className={styles.inspectorControl}>
                    <span>Size on canvas</span>
                    <div>
                      <button
                        type="button"
                        aria-label="Make selected piece smaller"
                        onClick={() =>
                          updateSelected({
                            width: clamp(
                              selectedCanvasItem.width - 14,
                              MIN_ITEM_WIDTH,
                              MAX_ITEM_WIDTH,
                            ),
                          })
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <i />
                      <button
                        type="button"
                        aria-label="Make selected piece larger"
                        onClick={() =>
                          updateSelected({
                            width: clamp(
                              selectedCanvasItem.width + 14,
                              MIN_ITEM_WIDTH,
                              MAX_ITEM_WIDTH,
                            ),
                          })
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className={styles.inspectorControl}>
                    <span>Rotation</span>
                    <div>
                      <button
                        type="button"
                        aria-label="Rotate selected piece left"
                        onClick={() =>
                          updateSelected({
                            rotation: selectedCanvasItem.rotation - 5,
                          })
                        }
                      >
                        −5°
                      </button>
                      <i />
                      <button
                        type="button"
                        aria-label="Rotate selected piece right"
                        onClick={() =>
                          updateSelected({
                            rotation: selectedCanvasItem.rotation + 5,
                          })
                        }
                      >
                        +5°
                      </button>
                    </div>
                  </div>

                  <div className={styles.layerActions}>
                    <button type="button" onClick={duplicateSelected}>
                      <Copy size={15} />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => bringToFront(selectedCanvasItem.instanceId)}
                    >
                      <Stack size={15} />
                      To front
                    </button>
                    <button
                      type="button"
                      onClick={() => sendToBack(selectedCanvasItem.instanceId)}
                    >
                      <Stack size={15} />
                      To back
                    </button>
                    <button
                      type="button"
                      className={styles.deleteAction}
                      onClick={removeSelected}
                    >
                      <Trash size={15} />
                      Remove
                    </button>
                  </div>

                  <div className={styles.stylingNote}>
                    <Sparkle size={15} weight="fill" />
                    <div>
                      <span>Styling note</span>
                      <p>{selectedCatalogItem.note}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.noSelection}>
                  <SidebarSimple size={22} />
                  <strong>Select a piece</strong>
                  <p>Move it freely, resize it, rotate it, or change its layer.</p>
                </div>
              )}

              <div className={styles.lookSummary}>
                <div>
                  <span>Look total</span>
                  <strong>{formatPrice(lookTotal)}</strong>
                </div>
                <button type="button" onClick={resetLook}>
                  <ArrowCounterClockwise size={14} />
                  Reset look
                </button>
              </div>
            </>
          )}
        </aside>
      </section>

      {catalogDragPreview?.moved ? (
        <div
          className={styles.catalogDragPreview}
          style={{
            left: catalogDragPreview.clientX,
            top: catalogDragPreview.clientY,
          }}
          aria-hidden="true"
        >
          <Image
            src={catalogById.get(catalogDragPreview.productId)?.image ?? ""}
            alt=""
            fill
            sizes="92px"
          />
          <span>
            <Plus size={12} weight="bold" />
          </span>
        </div>
      ) : null}
    </main>
  );
}
