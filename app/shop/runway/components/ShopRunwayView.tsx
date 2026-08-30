import { ArrowLeft, ArrowRight, Heart, Plus } from "@phosphor-icons/react";
import Image from "next/image";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import type { useShopRunway } from "../hooks/useShopRunway";
import type { ShopRunwayProduct } from "../types/shopRunway.types";
import styles from "./shopRunway.module.css";

type ShopRunwayState = ReturnType<typeof useShopRunway>;

type ShopRunwayViewProps = {
  state: ShopRunwayState;
  onAddToBag: (product: ShopRunwayProduct) => void;
  onShopLook: () => void;
};

type CarouselSlot = -3 | -2 | -1 | 0 | 1;

type ModelPose = {
  left: number;
  width: number;
  height: number;
  opacity: number;
  scale: number;
  blur: number;
  saturation: number;
  zIndex: number;
};

const modelPoses: Record<CarouselSlot, ModelPose> = {
  0: {
    left: 73,
    width: 36,
    height: 92,
    opacity: 1,
    scale: 1,
    blur: 0,
    saturation: 1,
    zIndex: 12,
  },
  [-1]: {
    left: 50,
    width: 22,
    height: 69,
    opacity: 0.78,
    scale: 0.96,
    blur: 0.4,
    saturation: 0.7,
    zIndex: 10,
  },
  [-2]: {
    left: 31,
    width: 17,
    height: 52,
    opacity: 0.48,
    scale: 0.92,
    blur: 2,
    saturation: 0.48,
    zIndex: 8,
  },
  [-3]: {
    left: 16,
    width: 13,
    height: 38,
    opacity: 0.24,
    scale: 0.84,
    blur: 5,
    saturation: 0.34,
    zIndex: 6,
  },
  1: {
    left: 112,
    width: 30,
    height: 86,
    opacity: 0,
    scale: 1,
    blur: 0,
    saturation: 1,
    zIndex: 14,
  },
};

function getCarouselSlot(
  index: number,
  activeIndex: number,
  length: number,
): CarouselSlot {
  const upcomingDistance = (index - activeIndex + length) % length;
  if (upcomingDistance === 0) return 0;
  if (upcomingDistance === length - 1) return 1;
  return -upcomingDistance as CarouselSlot;
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function getModelPose(index: number, state: ShopRunwayState): ModelPose {
  const startSlot = getCarouselSlot(
    index,
    state.activeIndex,
    state.looks.length,
  );
  const endSlot = getCarouselSlot(index, state.targetIndex, state.looks.length);
  const start = modelPoses[startSlot];
  const end = modelPoses[endSlot];
  const isWraparoundModel =
    state.motionDirection !== 0 &&
    ((startSlot === 1 && endSlot === -3) ||
      (startSlot === -3 && endSlot === 1));

  return {
    left: interpolate(start.left, end.left, state.motionProgress),
    width: interpolate(start.width, end.width, state.motionProgress),
    height: interpolate(start.height, end.height, state.motionProgress),
    opacity: isWraparoundModel
      ? 0
      : interpolate(start.opacity, end.opacity, state.motionProgress),
    scale: interpolate(start.scale, end.scale, state.motionProgress),
    blur: interpolate(start.blur, end.blur, state.motionProgress),
    saturation: interpolate(
      start.saturation,
      end.saturation,
      state.motionProgress,
    ),
    zIndex: state.motionProgress < 0.5 ? start.zIndex : end.zIndex,
  };
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("button, a, input, select, textarea"))
  );
}

export function ShopRunwayView({
  state,
  onAddToBag,
  onShopLook,
}: ShopRunwayViewProps) {
  function handleStageKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      state.step(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      state.step(1);
    }
  }

  function handleStagePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    const started = state.startDrag(
      event.clientX,
      event.currentTarget.clientWidth,
    );
    if (started) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleStagePointerMove(event: PointerEvent<HTMLElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    state.updateDrag(event.clientX);
  }

  function handleProductPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    const started = state.startDrag(
      -event.clientY,
      event.currentTarget.clientHeight,
    );
    if (started) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleProductPointerMove(event: PointerEvent<HTMLElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    state.updateDrag(-event.clientY);
  }

  function renderProductStack(
    look: ShopRunwayState["looks"][number],
    role: "current" | "incoming",
  ) {
    const direction = state.motionDirection || 1;
    const shift =
      role === "current"
        ? -direction * state.motionProgress * 100
        : direction * (1 - state.motionProgress) * 100;
    const hidden = role === "incoming";

    return (
      <div
        className={styles.productStack}
        data-role={role}
        key={`${role}-${look.id}`}
        aria-hidden={hidden}
        style={
          {
            "--product-shift": `${shift}%`,
            "--motion-duration": state.isAnimating ? "620ms" : "0ms",
          } as CSSProperties
        }
      >
        {look.products.map((product) => {
          const favorite = state.favoriteIds.includes(product.id);
          return (
            <article className={styles.runwayProduct} key={product.id}>
              <button
                className={styles.favorite}
                type="button"
                tabIndex={hidden ? -1 : undefined}
                aria-label={`${favorite ? "Remove" : "Add"} ${product.name} ${favorite ? "from" : "to"} favorites`}
                aria-pressed={favorite}
                onClick={() => state.toggleFavorite(product.id)}
              >
                <Heart size={13} weight={favorite ? "fill" : "regular"} />
              </button>
              <div className={styles.productVisual}>
                <Image
                  src={product.image}
                  alt={hidden ? "" : product.name}
                  fill
                  sizes="(max-width: 760px) 32vw, 24vw"
                />
              </div>
              <div className={styles.productCopy}>
                <span>{product.brand}</span>
                <strong>{product.name}</strong>
                <small>{product.formattedPrice}</small>
              </div>
              <button
                className={styles.addProduct}
                type="button"
                tabIndex={hidden ? -1 : undefined}
                aria-label={`Add ${product.name} to cart`}
                onClick={() => onAddToBag(product)}
              >
                <Plus size={13} />
              </button>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <main
      className={styles.runway}
      id="runway"
      data-dragging={state.isDragging}
      onMouseEnter={() => state.setPaused(true)}
      onMouseLeave={() => state.setPaused(false)}
      onFocusCapture={() => state.setPaused(true)}
      onBlurCapture={() => state.setPaused(false)}
    >
      <div className={styles.runwayShell}>
        <div className={styles.runwayLayout}>
          <section
            className={styles.stage}
            aria-labelledby="runway-title"
            aria-roledescription="perspective carousel"
            tabIndex={0}
            onKeyDown={handleStageKeyDown}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={state.endDrag}
            onPointerCancel={state.cancelDrag}
          >
            <div className={styles.intro}>
              <h2 id="runway-title">Spring Summer 2026</h2>
              <p>
                Drag across the runway to move through the collection. Every
                look stays connected to its live pieces and personal fit.
              </p>
            </div>

            <div className={styles.lookRail} aria-live="polite">
              {state.looks.map((look, index) => {
                const pose = getModelPose(index, state);
                const slot = getCarouselSlot(
                  index,
                  state.activeIndex,
                  state.looks.length,
                );
                const targetSlot = getCarouselSlot(
                  index,
                  state.targetIndex,
                  state.looks.length,
                );
                const isWraparoundModel =
                  state.motionDirection !== 0 &&
                  ((slot === 1 && targetSlot === -3) ||
                    (slot === -3 && targetSlot === 1));

                return (
                  <div
                    className={styles.look}
                    data-slot={slot}
                    data-active={slot === 0}
                    key={look.id}
                    style={
                      {
                        "--look-left": `${pose.left}%`,
                        "--look-width": `${pose.width}%`,
                        "--look-height": `${pose.height}%`,
                        "--look-opacity": pose.opacity,
                        "--look-scale": pose.scale,
                        "--look-blur": `${pose.blur}px`,
                        "--look-saturation": pose.saturation,
                        "--motion-duration": state.isAnimating
                          ? "620ms"
                          : "0ms",
                        "--look-opacity-duration": isWraparoundModel
                          ? "0ms"
                          : state.isAnimating
                            ? "620ms"
                            : "0ms",
                        zIndex: pose.zIndex,
                      } as CSSProperties
                    }
                  >
                    <Image
                      src={look.modelImage}
                      alt={slot === 0 ? look.modelAlt : ""}
                      fill
                      priority={index === 0}
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes="(max-width: 760px) 38vw, 36vw"
                    />
                  </div>
                );
              })}
            </div>

            <div className={styles.lookMeta} aria-live="polite">
              <strong>Look {state.activeLook.displayNumber}</strong>
              <button type="button" onClick={onShopLook}>
                Shop the look
              </button>
            </div>

            <div className={styles.runwayControls}>
              <button
                type="button"
                aria-label="Previous runway look"
                onClick={() => state.step(-1)}
              >
                <ArrowLeft size={13} />
              </button>
              <span>
                {state.activeLook.displayNumber} / {state.looks.length + 14}
              </span>
              <button
                type="button"
                aria-label="Next runway look"
                onClick={() => state.step(1)}
              >
                <ArrowRight size={13} />
              </button>
            </div>

            <button
              className={styles.advanceLook}
              type="button"
              aria-label="Advance to the next runway look"
              onClick={() => state.step(1)}
            >
              <ArrowRight size={14} />
            </button>
          </section>

          <aside
            className={styles.productRail}
            aria-label="Drag products vertically to change runway look"
            onPointerDown={handleProductPointerDown}
            onPointerMove={handleProductPointerMove}
            onPointerUp={state.endDrag}
            onPointerCancel={state.cancelDrag}
          >
            {renderProductStack(state.activeLook, "current")}
            {state.motionDirection !== 0
              ? renderProductStack(state.targetLook, "incoming")
              : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
