"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ModalSize = "sm" | "md" | "lg" | "xl";
export type ButtonSize = "sm" | "md" | "lg";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
  headerIcon?: ReactNode;
  buttonSize?: ButtonSize;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const buttonSizeClasses = {
  sm: "px-3 py-2 modal-button-text",
  md: "px-4 py-3 modal-button-text",
  lg: "px-6 py-4 modal-button-text",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = "",
  headerIcon,
  buttonSize = "md",
}: ModalProps) {
  // Helper function to get button classes
  const getButtonClasses = () => buttonSizeClasses[buttonSize];

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Track mouse down position to detect drag vs click
  const [mouseDownTarget, setMouseDownTarget] = useState<EventTarget | null>(null);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    // Only track if clicking directly on backdrop (not on modal content)
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      setMouseDownTarget(e.target);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if:
    // 1. Click target is the backdrop (not modal content)
    // 2. Mouse down started on backdrop (not dragged from inside)
    // 3. Close on backdrop click is enabled
    if (
      e.target === e.currentTarget &&
      mouseDownTarget === e.target &&
      closeOnBackdropClick
    ) {
      onClose();
    }
    // Reset mouse down target
    setMouseDownTarget(null);
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    // Reset if mouse up happens outside (user dragged and released outside)
    if (e.target !== e.currentTarget) {
      setMouseDownTarget(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto"
        style={{ position: 'fixed', zIndex: 9999, isolation: 'isolate' }}
        onMouseDown={handleBackdropMouseDown}
        onMouseUp={handleBackdropMouseUp}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
          className={`bg-[#FFFDF9] rounded-[24px] border-2 border-[#121212] shadow-[6px_6px_0_#121212] w-full ${sizeClasses[size]} ${className} max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || headerIcon || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#121212] bg-[#F7F4EB]">
              <div className="flex items-center space-x-3">
                {headerIcon && (
                  <div className="flex-shrink-0">
                    {headerIcon}
                  </div>
                )}
                {title && (
                  <div id="modal-title" className="text-lg font-black text-[#121212] tracking-tight leading-tight">
                    {title}
                  </div>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 w-8 h-8 bg-white hover:bg-[#FFD23F] border border-[#121212] rounded-full flex items-center justify-center transition-all duration-200 active:translate-y-0.5 cursor-pointer shadow-[1.5px_1.5px_0_#121212]"
                  aria-label="Đóng modal"
                >
                  <X className="w-4 h-4 text-[#121212]" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-7">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ModalButton component for consistent button styling within modals
export function ModalButton({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseClasses = "inline-flex items-center justify-center font-extrabold rounded-full border-2 border-[#121212] transition-all duration-200 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "bg-[#6B8045] hover:bg-[#1A2616] text-white shadow-[3px_3px_0_#121212] hover:shadow-[4px_4px_0_#121212]",
    secondary: "bg-white hover:bg-[#FFF8EE] text-[#121212] shadow-[2px_2px_0_#121212]",
    danger: "bg-[#D8261C] hover:bg-red-700 text-white shadow-[3px_3px_0_#121212]",
  };

  const sizeClasses = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />}
      {children}
    </button>
  );
}
