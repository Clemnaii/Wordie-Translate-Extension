export interface SelectionInfo {
  text: string;
  position: { x: number; y: number; width: number; height: number };
  context: string;
}

type Listener = () => void;

class ContentState {
  private static instance: ContentState;
  
  public selection: SelectionInfo | null = null;
  public isPopupVisible: boolean = false;
  public isIndicatorVisible: boolean = false;
  
  private listeners: Set<Listener> = new Set();

  private constructor() {}

  public static getInstance(): ContentState {
    if (!ContentState.instance) {
      ContentState.instance = new ContentState();
    }
    return ContentState.instance;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  public setSelection(selection: SelectionInfo | null) {
    this.selection = selection;
    if (selection) {
      this.isIndicatorVisible = true;
      this.isPopupVisible = false; // Reset popup when new selection
    } else {
      this.isIndicatorVisible = false;
      this.isPopupVisible = false;
    }
    this.notify();
  }

  public showPopup() {
    this.isIndicatorVisible = false;
    this.isPopupVisible = true;
    this.notify();
  }

  public hidePopup() {
    this.isPopupVisible = false;
    // Optionally show indicator again or just clear everything
    if (this.selection) {
      this.isIndicatorVisible = true;
    }
    this.notify();
  }
  
  public clear() {
    this.selection = null;
    this.isIndicatorVisible = false;
    this.isPopupVisible = false;
    this.notify();
  }
}

export const contentState = ContentState.getInstance();
