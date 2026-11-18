"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = forwardRef<
  ElementRef<typeof SheetPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-overlay bg-surface-dark/40",
      "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

type SheetSide = "right" | "left" | "bottom";

const sheetSide: Record<SheetSide, string> = {
  right:
    "inset-y-0 right-0 h-full w-3/4 max-w-[var(--container-modal)] data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right",
  left:
    "inset-y-0 left-0 h-full w-3/4 max-w-[var(--container-modal)] data-[state=open]:animate-slide-in-left data-[state=closed]:animate-slide-out-left",
  // 좁은 화면 미리보기 시트(edit-page-shell). 88%는 레이아웃 값이라 토큰 예외(dialog 85vh와 같은 근거) — 위로 덮개가 보여 닫을 수 있음을 알린다.
  bottom:
    "inset-x-0 bottom-0 max-h-[88%] rounded-t-xl border-b-0 data-[state=open]:animate-slide-in-bottom data-[state=closed]:animate-slide-out-bottom",
};

const SheetContent = forwardRef<
  ElementRef<typeof SheetPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { side?: SheetSide }
>(({ className, children, side = "right", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-overlay flex flex-col gap-base overflow-y-auto overscroll-contain border border-hairline bg-surface-card p-xl text-ink shadow-soft",
        sheetSide[side],
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close
        className="absolute right-base top-base rounded-sm p-xxs text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        aria-label="닫기"
      >
        <X size={20} aria-hidden />
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetTitle = forwardRef<
  ElementRef<typeof SheetPrimitive.Title>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(typo.titleLg, "text-ink", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = forwardRef<
  ElementRef<typeof SheetPrimitive.Description>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn(typo.bodyMd, "text-body", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetDescription,
};
