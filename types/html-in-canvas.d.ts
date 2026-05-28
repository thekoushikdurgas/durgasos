import * as React from 'react';

// Extends standard DOM types for the experimental WICG HTML-in-Canvas API

declare global {
  interface HTMLCanvasElement {
    layoutSubtree?: boolean;
    layoutsubtree?: string | boolean;
    onpaint?: ((this: HTMLCanvasElement, ev: Event) => any) | null;
    requestPaint?(): void;
    getElementTransform?(element: Element, drawTransform: DOMMatrix): DOMMatrix | null;
  }

  interface CanvasRenderingContext2D {
    drawElementImage?(
      element: Element,
      dx: number,
      dy: number,
      dWidth?: number,
      dHeight?: number
    ): DOMMatrix;
  }
}

declare module 'react' {
  interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
    /** WICG HTML-in-Canvas: must be lowercase on the DOM (not layoutSubtree). */
    layoutsubtree?: string | boolean;
  }
}
